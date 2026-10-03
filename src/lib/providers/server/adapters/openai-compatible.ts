import "server-only"

import type { ProviderId } from "../../types"
import { normalizeProviderError, ProviderError, providerErrorFromResponse } from "../provider-error"
import { cachedListing, credentialCacheKey, mergeWithCatalog } from "../model-cache"
import { createOpenAIClient, streamOpenAIChat } from "../protocols/openai-chat"
import type { ProviderAdapter, ProviderContext } from "../types"

type CompatibleConfig = {
  id: ProviderId
  /** Resolves the base URL from the user's saved options. Throws ProviderError on invalid input. */
  baseURL: (options: Record<string, string>) => string
  /** Keeps chat models out of listings that also contain embeddings, TTS, etc. */
  filter?: (id: string) => boolean
  streamUsage?: boolean
  defaultHeaders?: Record<string, string>
}

/**
 * Builds an adapter for any provider speaking OpenAI Chat Completions.
 * Discovery uses GET /models; when a provider doesn't expose it, verification
 * falls back to an authentication probe that costs no tokens.
 */
export function createCompatibleAdapter(config: CompatibleConfig): ProviderAdapter {
  const client = (ctx: ProviderContext) =>
    createOpenAIClient({ baseURL: config.baseURL(ctx.options), apiKey: ctx.apiKey, defaultHeaders: config.defaultHeaders })

  return {
    id: config.id,

    async verify(ctx) {
      try {
        await client(ctx).models.list()
        return
      } catch (error) {
        const normalized = normalizeProviderError(error, ctx.apiKey)
        if (!(normalized instanceof ProviderError)) throw normalized
        // No /models endpoint: probe authentication instead.
        if (normalized.status === 404 || normalized.status === 405) {
          await probeAuthentication(config.baseURL(ctx.options), ctx.apiKey, config.defaultHeaders)
          return
        }
        throw normalized
      }
    },

    async listModels(ctx) {
      return cachedListing(credentialCacheKey(config.id, ctx.apiKey, ctx.options), async () => {
        try {
          const page = await client(ctx).models.list()
          const ids = page.data.map((model) => model.id).filter((id) => (config.filter ? config.filter(id) : true))
          return mergeWithCatalog(config.id, ids.length ? ids : null)
        } catch {
          return mergeWithCatalog(config.id, null)
        }
      })
    },

    streamChat(ctx, request) {
      return streamOpenAIChat(
        {
          baseURL: config.baseURL(ctx.options),
          apiKey: ctx.apiKey,
          streamUsage: config.streamUsage,
          defaultHeaders: config.defaultHeaders,
        },
        request,
      )
    },
  }
}

/**
 * Sends a deliberately invalid chat request. Gateways authenticate before
 * validating, so 401/403 means a bad key and any other answer means the key
 * was accepted. No model runs, so nothing is billed.
 */
export async function probeAuthentication(baseURL: string, apiKey: string, headers?: Record<string, string>) {
  let response: Response
  try {
    response = await fetch(`${baseURL.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}`, ...headers },
      body: JSON.stringify({ model: "nebula-auth-probe", messages: [] }),
      signal: AbortSignal.timeout(15_000),
    })
  } catch (error) {
    throw normalizeProviderError(error, apiKey)
  }
  if (response.status === 401 || response.status === 403) {
    throw await providerErrorFromResponse(response, apiKey)
  }
  if (response.status >= 500) {
    throw await providerErrorFromResponse(response, apiKey)
  }
}
