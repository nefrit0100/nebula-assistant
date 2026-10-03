import "server-only"

import type { ModelInfo, ProviderId } from "../types"

export type ChatTurn = { role: "user" | "assistant"; content: string }

export type ChatRequest = {
  model: string
  system: string
  messages: ChatTurn[]
  signal: AbortSignal
  /** Ask the provider for readable reasoning summaries when it supports them. */
  showReasoning: boolean
}

export type FinishReason = "stop" | "length" | "refusal" | "content_filter" | "other"

export type Usage = {
  inputTokens?: number
  outputTokens?: number
  reasoningTokens?: number
}

/** The unified streaming vocabulary every adapter speaks. */
export type StreamPart =
  | { type: "text"; delta: string }
  | { type: "reasoning"; delta: string }
  | { type: "finish"; reason: FinishReason; usage?: Usage; servedModel?: string }

export type ProviderContext = {
  apiKey: string
  options: Record<string, string>
}

export type ModelListing = {
  models: ModelInfo[]
  /** True when live discovery failed and only curated entries are shown. */
  partial: boolean
}

export interface ProviderAdapter {
  id: ProviderId
  /** Validates the credential with a call that costs no tokens. Throws ProviderError. */
  verify(ctx: ProviderContext): Promise<void>
  listModels(ctx: ProviderContext): Promise<ModelListing>
  streamChat(ctx: ProviderContext, request: ChatRequest): AsyncIterable<StreamPart>
}
