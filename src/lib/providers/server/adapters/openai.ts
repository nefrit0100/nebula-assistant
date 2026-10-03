import "server-only"

import { normalizeProviderError } from "../provider-error"
import { cachedListing, credentialCacheKey, mergeWithCatalog } from "../model-cache"
import { createOpenAIClient } from "../protocols/openai-chat"
import { streamOpenAIResponses } from "../protocols/openai-responses"
import type { ProviderAdapter } from "../types"

const BASE_URL = "https://api.openai.com/v1"

const CHAT_MODEL = /^(gpt-|o\d|chatgpt-)/
const NON_CHAT = /(embedding|tts|whisper|transcribe|audio|realtime|image|dall-e|moderation|search|instruct|davinci|babbage|computer-use|sora|-\d{4}-\d{2}-\d{2}$)/
const REASONING = /^(gpt-5|gpt-6|o\d)/

export const openaiAdapter: ProviderAdapter = {
  id: "openai",

  async verify({ apiKey }) {
    try {
      await createOpenAIClient({ baseURL: BASE_URL, apiKey }).models.list()
    } catch (error) {
      throw normalizeProviderError(error, apiKey)
    }
  },

  async listModels({ apiKey, options }) {
    return cachedListing(credentialCacheKey("openai", apiKey, options), async () => {
      try {
        const page = await createOpenAIClient({ baseURL: BASE_URL, apiKey }).models.list()
        const ids = page.data.map((model) => model.id).filter((id) => CHAT_MODEL.test(id) && !NON_CHAT.test(id))
        return mergeWithCatalog("openai", ids)
      } catch {
        return mergeWithCatalog("openai", null)
      }
    })
  },

  streamChat({ apiKey }, request) {
    return streamOpenAIResponses({ baseURL: BASE_URL, apiKey, reasoningModel: REASONING.test(request.model) }, request)
  },
}
