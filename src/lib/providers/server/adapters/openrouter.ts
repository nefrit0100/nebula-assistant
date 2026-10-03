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
  /** USD per token, as decimal strings; "-1" marks variable pricing (routers). */
  pricing?: { prompt?: string; completion?: string }
}

function toPricing(pricing: OpenRouterModel["pricing"]): ModelInfo["pricing"] {
  const input = Number(pricing?.prompt)
  const output = Number(pricing?.completion)
  if (!pricing || !Number.isFinite(input) || !Number.isFinite(output) || input < 0 || output < 0) return undefined
  const perMillion = (perToken: number) => Number((perToken * 1_000_000).toPrecision(6))
  return { input: perMillion(input), output: perMillion(output) }
}

/** OpenRouter's public catalog carries real metadata, so nothing here is inferred. */
async function fetchCatalog(): Promise<ModelInfo[]> {
  return cachedPublic("openrouter:models:v2", async () => {
    const response = await fetch(`${BASE_URL}/models`, { signal: AbortSignal.timeout(15_000) })
    if (!response.ok) throw await providerErrorFromResponse(response)
    const json = (await response.json()) as { data?: OpenRouterModel[] }
    return (json.data ?? [])
      .filter((model) => model.architecture?.output_modalities?.includes("text") ?? true)
      .sort((a, b) => (b.created ?? 0) - (a.created ?? 0))
      .map<ModelInfo>((model) => {
        const params = model.supported_parameters ?? []
        const pricing = toPricing(model.pricing)
        const free = pricing?.input === 0 && pricing.output === 0
        // "Vendor: Name (free)" → "Name"; the vendor is in the id and "free" becomes a badge.
        let name = model.name?.replace(/^[^:]+:\s*/, "") || model.id
        if (free) name = name.replace(/\s*\(free\)\s*$/i, "") || name
        return {
          id: model.id,
          provider: "openrouter",
          name,
          pricing,
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
