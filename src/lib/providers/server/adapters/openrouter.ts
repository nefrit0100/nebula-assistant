import "server-only"

import type { ModelInfo } from "../../types"
import { normalizeProviderError, providerErrorFromResponse } from "../provider-error"
import { cachedPublic } from "../model-cache"
import { streamOpenAIChat } from "../protocols/openai-chat"
import type { ProviderAdapter } from "../types"

const BASE_URL = "https://openrouter.ai/api/v1"
const HEADERS = { "X-Title": "Nebula Assistant" }

type OpenRouterModel = {
  id: string
  name?: string
  created?: number
  context_length?: number | null
  architecture?: { input_modalities?: string[]; output_modalities?: string[] }
  top_provider?: { max_completion_tokens?: number | null }
  supported_parameters?: string[]
}

/** OpenRouter's public catalog carries real metadata, so nothing here is inferred. */
async function fetchCatalog(): Promise<ModelInfo[]> {
  return cachedPublic("openrouter:models", async () => {
    const response = await fetch(`${BASE_URL}/models`, { signal: AbortSignal.timeout(15_000) })
    if (!response.ok) throw await providerErrorFromResponse(response)
    const json = (await response.json()) as { data?: OpenRouterModel[] }
    return (json.data ?? [])
      .filter((model) => model.architecture?.output_modalities?.includes("text") ?? true)
      .sort((a, b) => (b.created ?? 0) - (a.created ?? 0))
      .map<ModelInfo>((model) => {
        const params = model.supported_parameters ?? []
        return {
          id: model.id,
          provider: "openrouter",
          name: model.name?.replace(/^[^:]+:\s*/, "") || model.id,
          contextWindow: model.context_length ?? undefined,
          maxOutput: model.top_provider?.max_completion_tokens ?? undefined,
          capabilities: {
            vision: model.architecture?.input_modalities?.includes("image") ?? false,
            reasoning: params.includes("reasoning") || params.includes("include_reasoning"),
            tools: params.includes("tools"),
          },
          source: "provider",
        }
      })
  })
}

export const openrouterAdapter: ProviderAdapter = {
  id: "openrouter",

  async verify({ apiKey }) {
    let response: Response
    try {
      response = await fetch(`${BASE_URL}/key`, {
        headers: { authorization: `Bearer ${apiKey}`, ...HEADERS },
        signal: AbortSignal.timeout(15_000),
      })
    } catch (error) {
      throw normalizeProviderError(error, apiKey)
    }
    if (!response.ok) throw await providerErrorFromResponse(response, apiKey)
  },

  async listModels() {
    try {
      return { models: await fetchCatalog(), partial: false }
    } catch {
      return { models: [], partial: true }
    }
  },

  streamChat({ apiKey }, request) {
    return streamOpenAIChat({ baseURL: BASE_URL, apiKey, defaultHeaders: HEADERS, streamUsage: true }, request)
  },
}
