import "server-only"

import { findCatalogEntry, humanizeModelId } from "../../catalog"
import type { ModelInfo } from "../../types"
import { ProviderError, providerErrorFromResponse } from "../provider-error"
import { cachedPublic } from "../model-cache"
import { streamAnthropicMessages } from "../protocols/anthropic-messages"
import { streamOpenAIChat } from "../protocols/openai-chat"
import { streamOpenAIResponses } from "../protocols/openai-responses"
import type { ProviderAdapter } from "../types"
import { probeAuthentication } from "./openai-compatible"

type Plan = "zen" | "go"
type Protocol = "chat" | "responses" | "messages" | "unsupported"

const ROOTS: Record<Plan, string> = {
  zen: "https://opencode.ai/zen",
  go: "https://opencode.ai/zen/go",
}

/**
 * OpenCode serves each model family over a specific wire protocol, and the
 * mapping differs between Zen and Go. Rules are checked in order; source:
 * https://opencode.ai/docs/zen/ and https://opencode.ai/docs/go/ (2026-10-02).
 * Gemini (Google protocol) and SystemOne models have no adapter yet and are hidden.
 */
const ROUTES: Record<Plan, Array<[RegExp, Protocol]>> = {
  zen: [
    [/^(gemini-|jev-)/, "unsupported"],
    [/^claude-/, "messages"],
    [/^(gpt-|grok-|muse-)/, "responses"],
    [/^qwen3\.8-max$/, "chat"],
    [/^qwen/, "messages"],
    [/./, "chat"],
  ],
  go: [
    [/^(gemini-|jev-)/, "unsupported"],
    [/^(gpt-|grok-|muse-)/, "responses"],
    [/^(minimax-|qwen)/, "messages"],
    [/./, "chat"],
  ],
}

function planOf(options: Record<string, string>): Plan {
  return options.plan === "go" ? "go" : "zen"
}

export function routeOpenCodeModel(plan: Plan, model: string): Protocol {
  return ROUTES[plan].find(([pattern]) => pattern.test(model))?.[1] ?? "chat"
}

async function fetchModelIds(plan: Plan): Promise<string[]> {
  return cachedPublic(`opencode:${plan}:models`, async () => {
    const response = await fetch(`${ROOTS[plan]}/v1/models`, { signal: AbortSignal.timeout(15_000) })
    if (!response.ok) throw await providerErrorFromResponse(response)
    const json = (await response.json()) as { data?: Array<{ id: string }> }
    return (json.data ?? []).map((model) => model.id)
  })
}

export const opencodeAdapter: ProviderAdapter = {
  id: "opencode",

  async verify({ apiKey, options }) {
    await probeAuthentication(`${ROOTS[planOf(options)]}/v1`, apiKey)
  },

  async listModels({ options }) {
    const plan = planOf(options)
    try {
      const ids = await fetchModelIds(plan)
      const models = ids
        .filter((id) => routeOpenCodeModel(plan, id) !== "unsupported")
        .map<ModelInfo>((id) => {
          const entry = findCatalogEntry(id)
          return entry
            ? { ...entry, provider: "opencode", source: "catalog", featured: false }
            : { id, provider: "opencode", name: humanizeModelId(id), capabilities: {}, source: "provider" }
        })
      return { models, partial: false }
    } catch {
      return { models: [], partial: true }
    }
  },

  streamChat({ apiKey, options }, request) {
    const plan = planOf(options)
    const root = ROOTS[plan]
    switch (routeOpenCodeModel(plan, request.model)) {
      case "messages":
        return streamAnthropicMessages({ baseURL: root, apiKey, auth: "bearer", allowFallbacks: false }, request)
      case "responses":
        return streamOpenAIResponses(
          { baseURL: `${root}/v1`, apiKey, reasoningModel: /^(gpt-5|gpt-6)/.test(request.model) },
          request,
        )
      case "chat":
        return streamOpenAIChat({ baseURL: `${root}/v1`, apiKey, streamUsage: true }, request)
      default:
        throw new ProviderError("model_not_found", "This OpenCode model uses a protocol Nebula doesn't support yet.")
    }
  },
}
