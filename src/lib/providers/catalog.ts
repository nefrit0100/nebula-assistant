import type { ModelInfo, ProviderId } from "./types"

/**
 * Curated model metadata. Every figure here is taken from the provider's own
 * documentation (see `source` comments) and was verified on the date noted.
 * Models a provider lists that are NOT in this file are still selectable; the UI
 * simply shows no capability details for them rather than guessing.
 *
 * To update: edit the entry, cite the source URL, bump `VERIFIED_ON`.
 */
export const CATALOG_VERIFIED_ON = "2026-10-02"

type CatalogEntry = Omit<ModelInfo, "provider" | "source">

const OPENAI: CatalogEntry[] = [
  // https://developers.openai.com/api/docs/models/gpt-5.5
  {
    id: "gpt-5.5",
    name: "GPT-5.5",
    contextWindow: 1_050_000,
    maxOutput: 128_000,
    capabilities: { vision: true, reasoning: true },
    featured: true,
  },
]

const ANTHROPIC: CatalogEntry[] = [
  // https://platform.claude.com/docs/en/about-claude/models/overview
  {
    id: "claude-opus-5-5",
    name: "Claude Opus 5.5",
    contextWindow: 1_000_000,
    maxOutput: 128_000,
    capabilities: { vision: true, reasoning: true, tools: true },
    featured: true,
  },
  {
    id: "claude-sonnet-5-5",
    name: "Claude Sonnet 5.5",
    contextWindow: 1_000_000,
    maxOutput: 128_000,
    capabilities: { vision: true, reasoning: true, tools: true },
    featured: true,
  },
  {
    id: "claude-fable-5-1",
    name: "Claude Fable 5.1",
    contextWindow: 1_000_000,
    maxOutput: 128_000,
    capabilities: { vision: true, reasoning: true, tools: true },
  },
  {
    id: "claude-haiku-4-5",
    name: "Claude Haiku 4.5",
    contextWindow: 200_000,
    capabilities: { vision: true, reasoning: true, tools: true },
    featured: true,
  },
]

const DEEPSEEK: CatalogEntry[] = [
  // https://api-docs.deepseek.com/quick_start/pricing (2026-10-03)
  {
    id: "deepseek-v4-pro",
    name: "DeepSeek V4 Pro",
    contextWindow: 1_000_000,
    maxOutput: 384_000,
    capabilities: { vision: false, reasoning: true, tools: true },
    featured: true,
  },
  {
    id: "deepseek-flash",
    name: "DeepSeek V4.1 Flash",
    contextWindow: 1_000_000,
    maxOutput: 384_000,
    capabilities: { vision: true, reasoning: true, tools: true },
    featured: true,
  },
  // Legacy name, still accepted and served by DeepSeek-V4.1-Flash.
  {
    id: "deepseek-v4-flash",
    name: "DeepSeek V4 Flash",
    contextWindow: 1_000_000,
    capabilities: { reasoning: true },
  },
]

const ZHIPU: CatalogEntry[] = [
  // https://docs.z.ai/guides/llm/glm-5.3
  {
    id: "glm-5.3",
    name: "GLM-5.3",
    contextWindow: 1_000_000,
    maxOutput: 128_000,
    capabilities: { vision: false, reasoning: true, tools: true },
    featured: true,
  },
  { id: "glm-5.2", name: "GLM-5.2", capabilities: {} },
  { id: "glm-5.1", name: "GLM-5.1", capabilities: {} },
]

const ALIBABA: CatalogEntry[] = [
  // https://www.alibabacloud.com/help/en/model-studio/compatibility-of-openai-with-dashscope
  { id: "qwen3.8-max", name: "Qwen3.8 Max", capabilities: {}, featured: true },
  { id: "qwen-plus", name: "Qwen Plus", capabilities: {}, featured: true },
  { id: "qwen-turbo", name: "Qwen Turbo", capabilities: {} },
]

const CATALOG: Record<ProviderId, CatalogEntry[]> = {
  openai: OPENAI,
  anthropic: ANTHROPIC,
  deepseek: DEEPSEEK,
  alibaba: ALIBABA,
  zhipu: ZHIPU,
  // OpenRouter publishes full metadata through its public models API.
  openrouter: [],
  // OpenCode proxies other labs' models; metadata is borrowed from the
  // first-party entries above when the model id matches.
  opencode: [],
}

export function catalogModels(provider: ProviderId): ModelInfo[] {
  return CATALOG[provider].map((entry) => ({ ...entry, provider, source: "catalog" as const }))
}

/** Looks up first-party metadata for a model id across all providers. */
export function findCatalogEntry(modelId: string): CatalogEntry | undefined {
  for (const entries of Object.values(CATALOG)) {
    const hit = entries.find((entry) => entry.id === modelId)
    if (hit) return hit
  }
  return undefined
}

/** Brand spellings that capitalizing the first letter gets wrong. */
const BRANDS: Record<string, string> = { deepseek: "DeepSeek", minimax: "MiniMax", longcat: "LongCat" }

/** Turns an id like "qwen3.6-plus", "gpt-5.4-mini" or "claude-sonnet-4-5" into a readable label. */
export function humanizeModelId(id: string): string {
  const base = id.includes("/") ? id.slice(id.lastIndexOf("/") + 1) : id
  return base
    // Dashed versions read as decimals ("sonnet-4-5" → "4.5"); dates and long numbers are left alone.
    .replace(/(^|-)(\d)-(\d{1,2})(?=-|$)/g, "$1$2.$3")
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLowerCase()
      if (Object.hasOwn(BRANDS, lower)) return BRANDS[lower]
      if (/^(gpt|glm|qwq|vl|ai|api)$/.test(lower)) return lower.toUpperCase()
      if (/^\d/.test(part)) return part
      return part.charAt(0).toUpperCase() + part.slice(1)
    })
    .join(" ")
    .replace(/^GPT /, "GPT-")
    .replace(/^GLM /, "GLM-")
}
