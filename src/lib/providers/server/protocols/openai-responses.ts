import "server-only"

import OpenAI from "openai"
import type { ResponseCreateParamsStreaming } from "openai/resources/responses/responses"
import { AbortedError, normalizeProviderError, ProviderError } from "../provider-error"
import type { ChatRequest, FinishReason, StreamPart, Usage } from "../types"
import { createOpenAIClient } from "./openai-chat"

export type OpenAIResponsesEndpoint = {
  baseURL: string
  apiKey: string
  /** Whether the model accepts `reasoning.summary`. */
  reasoningModel: boolean
}

/**
 * OpenAI Responses wire protocol (OpenAI, and GPT/Grok models on OpenCode).
 * `store: false` keeps the provider from retaining the response for later retrieval.
 */
export async function* streamOpenAIResponses(
  endpoint: OpenAIResponsesEndpoint,
  request: ChatRequest,
): AsyncGenerator<StreamPart> {
  const client = createOpenAIClient(endpoint)
  const wantSummary = endpoint.reasoningModel && request.showReasoning

  const base: ResponseCreateParamsStreaming = {
    model: request.model,
    instructions: request.system || undefined,
    input: request.messages.map((turn) => ({ role: turn.role, content: turn.content })),
    stream: true,
    store: false,
  }

  let stream: AsyncIterable<OpenAI.Responses.ResponseStreamEvent>
  try {
    stream = await client.responses.create(
      wantSummary ? { ...base, reasoning: { summary: "auto" } } : base,
      { signal: request.signal },
    )
  } catch (error) {
    // Some accounts can't request reasoning summaries (e.g. unverified
    // organizations). Retry once without them rather than failing the turn.
    if (wantSummary && error instanceof OpenAI.BadRequestError && /summar|reasoning|verif/i.test(error.message)) {
      try {
        stream = await client.responses.create(base, { signal: request.signal })
      } catch (retryError) {
        throw normalizeProviderError(retryError, endpoint.apiKey)
      }
    } else {
      throw normalizeProviderError(error, endpoint.apiKey)
    }
  }

  let finish: FinishReason = "stop"
  let usage: Usage | undefined
  let servedModel: string | undefined

  try {
    for await (const event of stream) {
      switch (event.type) {
        case "response.output_text.delta":
          if (event.delta) yield { type: "text", delta: event.delta }
          break
        case "response.refusal.delta":
          finish = "refusal"
          if (event.delta) yield { type: "text", delta: event.delta }
          break
        case "response.reasoning_summary_text.delta":
        case "response.reasoning_text.delta":
          if (event.delta) yield { type: "reasoning", delta: event.delta }
          break
        case "response.reasoning_summary_part.done":
          yield { type: "reasoning", delta: "\n\n" }
          break
        case "response.completed":
        case "response.incomplete": {
          const response = event.response
          servedModel = response.model
          if (response.usage) {
            usage = {
              inputTokens: response.usage.input_tokens,
              outputTokens: response.usage.output_tokens,
              reasoningTokens: response.usage.output_tokens_details?.reasoning_tokens,
            }
          }
          if (event.type === "response.incomplete") {
            const reason = response.incomplete_details?.reason
            finish = reason === "max_output_tokens" ? "length" : reason === "content_filter" ? "content_filter" : "other"
          }
          break
        }
        case "response.failed": {
          const failure = event.response.error
          throw new ProviderError(
            failure?.code === "rate_limit_exceeded" ? "rate_limited" : "provider_unavailable",
            failure?.message ? `${failure.code ?? "error"} — ${failure.message}` : undefined,
          )
        }
        case "error":
          throw new ProviderError(
            event.code === "rate_limit_exceeded" ? "rate_limited" : "provider_unavailable",
            `${event.code ?? "error"} — ${event.message}`,
          )
      }
    }
  } catch (error) {
    throw normalizeProviderError(error, endpoint.apiKey)
  }
  // The SDK ends the iterator quietly on abort; surface it so the reply is stored as stopped.
  if (request.signal.aborted) throw new AbortedError()

  yield { type: "finish", reason: finish, usage, servedModel }
}
