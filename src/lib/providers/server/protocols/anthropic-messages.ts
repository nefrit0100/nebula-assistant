import "server-only"

import Anthropic from "@anthropic-ai/sdk"
import type { BetaMessageStreamParams } from "@anthropic-ai/sdk/resources/beta/messages/messages"
import type { MessageStreamParams } from "@anthropic-ai/sdk/resources/messages/messages"
import { findCatalogEntry } from "../../catalog"
import { AbortedError, normalizeProviderError } from "../provider-error"
import type { ChatRequest, FinishReason, StreamPart, Usage } from "../types"

export type AnthropicEndpoint = {
  /** Root URL; the SDK appends /v1/messages. */
  baseURL: string
  apiKey: string
  /** "x-api-key" for the Claude API; "bearer" for gateways such as OpenCode. */
  auth: "x-api-key" | "bearer"
  /** Server-side refusal fallbacks are a Claude API feature; gateways don't get them. */
  allowFallbacks: boolean
}

/** Models that take `thinking: { type: "adaptive" }` (Claude 4.6 and later). */
const ADAPTIVE_THINKING = /^claude-(opus|sonnet|fable|mythos)-(4-[6-9]|[5-9])(\b|-)/
/** Models that accept `fallbacks: "default"` (see the Claude API refusal-fallback docs). */
const FALLBACK_MODELS = new Set(["claude-opus-5-5", "claude-opus-5", "claude-fable-5-1", "claude-sonnet-5-5"])

export function createAnthropicClient(endpoint: Pick<AnthropicEndpoint, "baseURL" | "apiKey" | "auth">) {
  // apiKey/authToken/baseURL are always passed explicitly so the SDK never falls
  // back to ANTHROPIC_* environment variables on the server.
  return new Anthropic({
    baseURL: endpoint.baseURL,
    apiKey: endpoint.auth === "x-api-key" ? endpoint.apiKey : null,
    authToken: endpoint.auth === "bearer" ? endpoint.apiKey : null,
    maxRetries: 1,
    timeout: 90_000,
  })
}

/** Anthropic Messages wire protocol (Claude API, and Claude/Qwen/MiniMax on OpenCode). */
export async function* streamAnthropicMessages(endpoint: AnthropicEndpoint, request: ChatRequest): AsyncGenerator<StreamPart> {
  const client = createAnthropicClient(endpoint)
  const adaptive = ADAPTIVE_THINKING.test(request.model)
  const useFallbacks = endpoint.allowFallbacks && FALLBACK_MODELS.has(request.model)

  const params: MessageStreamParams = {
    model: request.model,
    max_tokens: maxTokensFor(request.model),
    messages: request.messages.map((turn) => ({ role: turn.role, content: turn.content })),
    ...(request.system ? { system: request.system } : {}),
    // Adaptive thinking is the default on current Claude models; "summarized"
    // makes the reasoning readable instead of empty. Older and non-Claude
    // models get no thinking parameter at all.
    ...(adaptive && request.showReasoning ? { thinking: { type: "adaptive", display: "summarized" } } : {}),
  }

  let finish: FinishReason = "stop"
  let usage: Usage | undefined
  let servedModel: string | undefined

  try {
    // Refusal fallbacks live on the beta endpoint; everything else (including
    // gateways) uses the stable Messages endpoint.
    const stream = useFallbacks
      ? client.beta.messages.stream(
          { ...params, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" } as BetaMessageStreamParams,
          { signal: request.signal },
        )
      : client.messages.stream(params, { signal: request.signal })

    for await (const event of stream as AsyncIterable<{ type: string; delta?: { type: string; text?: string; thinking?: string } }>) {
      if (event.type !== "content_block_delta" || !event.delta) continue
      if (event.delta.type === "text_delta" && event.delta.text) {
        yield { type: "text", delta: event.delta.text }
      } else if (event.delta.type === "thinking_delta" && event.delta.thinking) {
        yield { type: "reasoning", delta: event.delta.thinking }
      }
    }
    if (request.signal.aborted) throw new AbortedError()
    const final = await stream.finalMessage()
    servedModel = final.model
    finish = mapStopReason(final.stop_reason)
    usage = { inputTokens: final.usage.input_tokens, outputTokens: final.usage.output_tokens }
  } catch (error) {
    throw normalizeProviderError(error, endpoint.apiKey)
  }

  yield { type: "finish", reason: finish, usage, servedModel }
}

function maxTokensFor(model: string): number {
  const known = findCatalogEntry(model)?.maxOutput
  if (known) return Math.min(known, 64_000)
  return model.startsWith("claude-") ? 32_000 : 8_192
}

function mapStopReason(reason: string | null): FinishReason {
  switch (reason) {
    case "end_turn":
    case "stop_sequence":
      return "stop"
    case "max_tokens":
    case "model_context_window_exceeded":
      return "length"
    case "refusal":
      return "refusal"
    default:
      return "other"
  }
}
