import "server-only"

import OpenAI from "openai"
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions"
import { AbortedError, normalizeProviderError } from "../provider-error"
import type { ChatRequest, FinishReason, StreamPart, Usage } from "../types"

export type OpenAIChatEndpoint = {
  baseURL: string
  apiKey: string
  defaultHeaders?: Record<string, string>
  /** Request a final usage chunk (stream_options.include_usage). */
  streamUsage?: boolean
}

export function createOpenAIClient(endpoint: { baseURL: string; apiKey: string; defaultHeaders?: Record<string, string> }) {
  return new OpenAI({
    apiKey: endpoint.apiKey,
    baseURL: endpoint.baseURL,
    defaultHeaders: endpoint.defaultHeaders,
    maxRetries: 1,
    // Covers connection + time to first byte; streamed bodies are not cut off.
    timeout: 90_000,
  })
}

/**
 * OpenAI Chat Completions wire protocol. Spoken natively or compatibly by
 * DeepSeek, Alibaba Model Studio, Zhipu, OpenRouter and most OpenCode models.
 * Reasoning text arrives as `reasoning_content` (DeepSeek, Qwen, GLM) or
 * `reasoning` (OpenRouter); both are surfaced.
 */
export async function* streamOpenAIChat(endpoint: OpenAIChatEndpoint, request: ChatRequest): AsyncGenerator<StreamPart> {
  const client = createOpenAIClient(endpoint)
  const messages: ChatCompletionMessageParam[] = [
    ...(request.system ? [{ role: "system" as const, content: request.system }] : []),
    ...request.messages.map((turn) => ({ role: turn.role, content: turn.content })),
  ]

  let finish: FinishReason | undefined
  let usage: Usage | undefined
  let servedModel: string | undefined

  try {
    const stream = await client.chat.completions.create(
      {
        model: request.model,
        messages,
        stream: true,
        ...(endpoint.streamUsage ? { stream_options: { include_usage: true } } : {}),
      },
      { signal: request.signal },
    )

    for await (const chunk of stream) {
      servedModel ??= chunk.model || undefined
      const choice = chunk.choices?.[0]
      const delta = choice?.delta as (Record<string, unknown> & { content?: string | null }) | undefined
      const reasoning = delta?.reasoning_content ?? delta?.reasoning
      if (typeof reasoning === "string" && reasoning) yield { type: "reasoning", delta: reasoning }
      if (typeof delta?.content === "string" && delta.content) yield { type: "text", delta: delta.content }
      if (choice?.finish_reason) finish = mapFinish(choice.finish_reason)
      if (chunk.usage) {
        usage = {
          inputTokens: chunk.usage.prompt_tokens,
          outputTokens: chunk.usage.completion_tokens,
          reasoningTokens: chunk.usage.completion_tokens_details?.reasoning_tokens ?? undefined,
        }
      }
    }
  } catch (error) {
    throw normalizeProviderError(error, endpoint.apiKey)
  }
  // The SDK ends the iterator quietly on abort; surface it so the reply is stored as stopped.
  if (request.signal.aborted) throw new AbortedError()

  yield { type: "finish", reason: finish ?? "stop", usage, servedModel }
}

function mapFinish(reason: string): FinishReason {
  switch (reason) {
    case "stop":
      return "stop"
    case "length":
      return "length"
    case "content_filter":
      return "content_filter"
    default:
      return "other"
  }
}
