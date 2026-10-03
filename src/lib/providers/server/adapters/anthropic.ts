import "server-only"

import { findCatalogEntry } from "../../catalog"
import type { ModelInfo } from "../../types"
import { normalizeProviderError } from "../provider-error"
import { cachedListing, credentialCacheKey, mergeWithCatalog } from "../model-cache"
import { createAnthropicClient, streamAnthropicMessages } from "../protocols/anthropic-messages"
import type { ProviderAdapter } from "../types"

const BASE_URL = "https://api.anthropic.com"

export const anthropicAdapter: ProviderAdapter = {
  id: "anthropic",

  async verify({ apiKey }) {
    try {
      await createAnthropicClient({ baseURL: BASE_URL, apiKey, auth: "x-api-key" }).models.list({ limit: 1 })
    } catch (error) {
      throw normalizeProviderError(error, apiKey)
    }
  },

  async listModels({ apiKey, options }) {
    return cachedListing(credentialCacheKey("anthropic", apiKey, options), async () => {
      try {
        const client = createAnthropicClient({ baseURL: BASE_URL, apiKey, auth: "x-api-key" })
        const page = await client.models.list({ limit: 100 })
        const featuredOrder = mergeWithCatalog("anthropic", page.data.map((model) => model.id)).models
        // The Models API reports context window, output cap and capabilities itself.
        const byId = new Map(page.data.map((model) => [model.id, model]))
        const models: ModelInfo[] = featuredOrder.map((model) => {
          const live = byId.get(model.id)
          if (!live) return model
          const catalog = findCatalogEntry(model.id)
          return {
            ...model,
            name: live.display_name || model.name,
            contextWindow: live.max_input_tokens ?? catalog?.contextWindow,
            maxOutput: live.max_tokens ?? catalog?.maxOutput,
            capabilities: live.capabilities
              ? {
                  vision: live.capabilities.image_input.supported,
                  reasoning: live.capabilities.thinking.supported,
                  tools: true,
                }
              : model.capabilities,
            source: live.capabilities ? "provider" : model.source,
          }
        })
        return { models, partial: false }
      } catch {
        return mergeWithCatalog("anthropic", null)
      }
    })
  },

  streamChat({ apiKey }, request) {
    return streamAnthropicMessages({ baseURL: BASE_URL, apiKey, auth: "x-api-key", allowFallbacks: true }, request)
  },
}
