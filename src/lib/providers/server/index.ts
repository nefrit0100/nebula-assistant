import "server-only"

import type { ProviderId } from "../types"
import { anthropicAdapter } from "./adapters/anthropic"
import { alibabaAdapter, deepseekAdapter, zhipuAdapter } from "./adapters/compatible-providers"
import { opencodeAdapter } from "./adapters/opencode"
import { openaiAdapter } from "./adapters/openai"
import { openrouterAdapter } from "./adapters/openrouter"
import type { ProviderAdapter } from "./types"

const ADAPTERS: Record<ProviderId, ProviderAdapter> = {
  openai: openaiAdapter,
  anthropic: anthropicAdapter,
  deepseek: deepseekAdapter,
  alibaba: alibabaAdapter,
  zhipu: zhipuAdapter,
  openrouter: openrouterAdapter,
  opencode: opencodeAdapter,
}

/** The single entry point the rest of the app uses; it never imports a provider directly. */
export function getAdapter(provider: ProviderId): ProviderAdapter {
  return ADAPTERS[provider]
}

export { ProviderError, AbortedError, normalizeProviderError } from "./provider-error"
export type { ChatRequest, ChatTurn, StreamPart, ProviderContext, FinishReason, Usage } from "./types"
