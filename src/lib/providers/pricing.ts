import type { ModelInfo, ModelPricing, ProviderId } from "./types"

/**
 * Published list prices per million tokens: standard tier, no caching or batch
 * discounts. Every figure is copied from the provider's own pricing page (`url`)
 * and was checked on the date below. OpenRouter is absent because its models API
 * reports prices itself. Models missing here simply show no price.
 *
 * To update: edit the rates, keep the source URL, bump `PRICES_CHECKED_ON`.
 */
export const PRICES_CHECKED_ON = "2026-10-03"

type RateDetail = { from?: true; note?: string }
type Rate = readonly [input: number, output: number, detail?: RateDetail]
type PriceList = { url: string; currency?: "CNY"; note?: string; rates: Record<string, Rate> }

const LONG_PROMPTS: RateDetail = { from: true, note: "Higher for long prompts." }
const THINKING: RateDetail = { from: true, note: "Higher in thinking mode." }
const LONG_OR_THINKING: RateDetail = { from: true, note: "Higher for long prompts and in thinking mode." }
const DEEPSEEK_PEAK: RateDetail = {
  from: true,
  note: "Double during peak hours: 01:00–04:00 and 06:00–10:00 UTC on weekdays.",
}
const FREE: Rate = [0, 0]

const OPENAI: PriceList = {
  url: "https://developers.openai.com/api/docs/pricing",
  rates: {
    "gpt-6-astra": [10, 50, LONG_PROMPTS],
    "gpt-6.1-sol": [2, 10, LONG_PROMPTS],
    "gpt-6-sol": [2, 10, LONG_PROMPTS],
    "gpt-6-luna": [0.1, 0.5, LONG_PROMPTS],
    "gpt-5.6-sol": [4, 20, LONG_PROMPTS],
    "gpt-5.6-terra": [2, 12, LONG_PROMPTS],
    "gpt-5.6-luna": [0.2, 1.2, LONG_PROMPTS],
    "gpt-5.5": [5, 30, LONG_PROMPTS],
    "gpt-5.5-pro": [30, 180, LONG_PROMPTS],
    "gpt-5.4": [2.5, 15, LONG_PROMPTS],
    "gpt-5.4-pro": [30, 180, LONG_PROMPTS],
    "gpt-5.4-mini": [0.75, 4.5],
    "gpt-5.4-nano": [0.2, 1.25],
    "gpt-5.3-codex": [1.75, 14],
    "gpt-5.2": [1.75, 14],
    "gpt-5.2-pro": [21, 168],
    "gpt-5.1": [1.25, 10],
    "gpt-5": [1.25, 10],
    "gpt-5-mini": [0.25, 2],
    "gpt-5-nano": [0.05, 0.4],
    "gpt-5-pro": [15, 120],
    "chat-latest": [5, 30],
    "gpt-4.1": [2, 8],
    "gpt-4.1-mini": [0.4, 1.6],
    "gpt-4.1-nano": [0.1, 0.4],
    "gpt-4o": [2.5, 10],
    "gpt-4o-2024-05-13": [5, 15],
    "gpt-4o-mini": [0.15, 0.6],
    "o4-mini": [1.1, 4.4],
    o3: [2, 8],
    "o3-mini": [1.1, 4.4],
    "o3-pro": [20, 80],
    o1: [15, 60],
    "o1-pro": [150, 600],
    "gpt-4-turbo": [10, 30],
    "gpt-4-0613": [30, 60],
    "gpt-3.5-turbo": [0.5, 1.5],
    "gpt-3.5-turbo-0125": [0.5, 1.5],
    "gpt-3.5-turbo-1106": [1, 2],
    "gpt-3.5-turbo-instruct": [1.5, 2],
  },
}

const ANTHROPIC: PriceList = {
  url: "https://platform.claude.com/docs/en/about-claude/pricing",
  rates: {
    "claude-fable-5-1": [10, 50],
    "claude-mythos-5-1": [10, 50],
    "claude-fable-5": [10, 50],
    "claude-mythos-5": [10, 50],
    "claude-opus-5-5": [4, 20],
    "claude-opus-5": [5, 25],
    "claude-opus-4-8": [5, 25],
    "claude-opus-4-7": [5, 25],
    "claude-opus-4-6": [5, 25],
    "claude-opus-4-5": [5, 25],
    "claude-sonnet-5-5": [2, 10],
    "claude-sonnet-5": [2, 10],
    "claude-sonnet-4-6": [3, 15],
    "claude-sonnet-4-5": [3, 15],
    "claude-haiku-4-5": [1, 5],
  },
}

const DEEPSEEK: PriceList = {
  url: "https://api-docs.deepseek.com/quick_start/pricing",
  rates: {
    "deepseek-flash": [0.15, 0.6, DEEPSEEK_PEAK],
    // Legacy names, served by DeepSeek-V4.1-Flash at the Flash price.
    "deepseek-v4-flash": [0.15, 0.6, DEEPSEEK_PEAK],
    "deepseek-v4-flash-vision-exp": [0.15, 0.6, DEEPSEEK_PEAK],
    "deepseek-v4-pro": [0.66, 1.98, DEEPSEEK_PEAK],
  },
}

/** International (Singapore) deployment. Other regions price differently and aren't listed. */
const ALIBABA_INTL: PriceList = {
  url: "https://www.alibabacloud.com/help/en/model-studio/model-pricing",
  note: "Singapore region prices.",
  rates: {
    "qwen3.8-max": [2, 6],
    "qwen3.7-max": [2.5, 7.5],
    "qwen3.7-max-preview": [2.5, 7.5],
    "qwen3.6-max-preview": [1.3, 7.8, LONG_PROMPTS],
    "qwen3-max": [1.2, 6, LONG_PROMPTS],
    "qwen3-max-preview": [1.2, 6, LONG_PROMPTS],
    "qwen-max": [1.6, 6.4],
    "qwen3.7-plus": [0.4, 1.6, LONG_PROMPTS],
    "qwen3.6-plus": [0.5, 3, LONG_PROMPTS],
    "qwen3.5-plus": [0.4, 2.4, LONG_PROMPTS],
    "qwen-plus": [0.4, 1.2, LONG_OR_THINKING],
    "qwen-plus-latest": [0.4, 1.2, LONG_OR_THINKING],
    "qwen3.8-flash": [0.15, 0.47],
    "qwen3.7-flash": [0.03, 0.13, LONG_PROMPTS],
    "qwen3.6-flash": [0.25, 1.5, LONG_PROMPTS],
    "qwen3.5-flash": [0.1, 0.4],
    "qwen-flash": [0.05, 0.4, LONG_PROMPTS],
    "qwen-turbo": [0.05, 0.2, THINKING],
    "qwq-plus": [0.8, 2.4],
    "qwen3-coder-plus": [1, 5, LONG_PROMPTS],
    "qwen3-coder-flash": [0.3, 1.5, LONG_PROMPTS],
    "qwen-long-latest": [0.072, 0.287],
  },
}

const ZAI: PriceList = {
  url: "https://docs.z.ai/guides/overview/pricing",
  rates: {
    "glm-5.3": [1.4, 4.4],
    "glm-5.3-flashx": [0.37, 1.25],
    "glm-5.3-flash": [0.15, 0.5],
    "glm-5.2": [1.4, 4.4],
    "glm-5.1": [1.4, 4.4],
    "glm-5": [1, 3.2],
    "glm-4.7": [0.6, 2.2],
    "glm-4.7-flashx": [0.07, 0.4],
    "glm-4.7-flash": FREE,
    "glm-4.6": [0.6, 2.2],
    "glm-4.5": [0.6, 2.2],
    "glm-4.5-x": [2.2, 8.9],
    "glm-4.5-air": [0.2, 1.1],
    "glm-4.5-airx": [1.1, 4.5],
    "glm-4.5-flash": FREE,
    "glm-4-32b-0414-128k": [0.1, 0.1],
  },
}

const BIGMODEL: PriceList = {
  url: "https://open.bigmodel.cn/pricing",
  currency: "CNY",
  rates: {
    "glm-5.3": [8, 28],
    "glm-5.3-flash": [0.8, 2.8],
    "glm-5.2": [8, 28],
    "glm-5.1": [6, 24, { from: true, note: "Higher for prompts over 32K tokens." }],
    "glm-4.7-flash": FREE,
  },
}

const OPENCODE_ZEN: PriceList = {
  url: "https://opencode.ai/docs/zen/",
  rates: {
    "big-pickle": FREE,
    "space-bunny-free": FREE,
    "longcat-2.5-preview-free": FREE,
    "mimo-v2.6-flash-free": FREE,
    "mimo-v2.5-free": FREE,
    "ling-3.1-flash-free": FREE,
    "ling-3.0-flash-fin-free": FREE,
    "nemotron-3-ultra-free": FREE,
    "nemotron-3.5-lightning-free": FREE,
    "muse-spark-1.3-contributor-free": FREE,
    "minimax-m3": [0.3, 1.2],
    "minimax-m2.7": [0.3, 1.2],
    "minimax-m2.5": [0.3, 1.2],
    "glm-5.3-flash": [0.15, 0.5],
    "glm-5.3": [1.4, 4.4],
    "glm-5.2": [1.4, 4.4],
    "glm-5.1": [1.4, 4.4],
    "glm-5": [1, 3.2],
    "kimi-k3": [3, 15],
    "kimi-k2.7-code": [0.95, 4],
    "kimi-k2.6": [0.95, 4],
    "kimi-k2.5": [0.6, 3],
    "qwen3.8-max": [2, 6],
    "qwen3.8-flash": [0.15, 0.47],
    "qwen3.7-max": [2.5, 7.5],
    "qwen3.7-plus": [0.4, 1.6],
    "qwen3.6-plus": [0.5, 3],
    "qwen3.5-plus": [0.2, 1.2],
    "deepseek-v4.1-flash": [0.3, 1.2],
    "deepseek-v4-pro": [1.74, 3.48],
    "deepseek-v4-flash": [0.14, 0.28],
    "deepseek-v4-flash-vision-exp": [0.14, 0.28],
    "claude-fable-5-1": [10, 50],
    "claude-fable-5": [10, 50],
    "claude-opus-5-5": [4, 20],
    "claude-opus-5": [5, 25],
    "claude-opus-4-8": [5, 25],
    "claude-opus-4-7": [5, 25],
    "claude-opus-4-6": [5, 25],
    "claude-opus-4-5": [5, 25],
    "claude-sonnet-5": [2, 10],
    "claude-sonnet-4-6": [3, 15],
    "claude-sonnet-4-5": [3, 15, LONG_PROMPTS],
    "claude-haiku-4-5": [1, 5],
    "grok-4.7": [2, 6, LONG_PROMPTS],
    "grok-4.6": [2, 6, LONG_PROMPTS],
    "grok-4.5": [2, 6, LONG_PROMPTS],
    "grok-build-0.1": [1, 2],
    "muse-spark-1.3": [1.25, 4.25],
    "muse-spark-1.2": [1.25, 4.25],
    "gpt-6-astra": [10, 50, LONG_PROMPTS],
    "gpt-6-sol": [2, 10, LONG_PROMPTS],
    "gpt-6.1-sol": [2, 10, LONG_PROMPTS],
    "gpt-6-luna": [0.1, 0.5, LONG_PROMPTS],
    "gpt-5.6-sol": [4, 20, LONG_PROMPTS],
    "gpt-5.6-terra": [2, 12, LONG_PROMPTS],
    "gpt-5.6-luna": [0.2, 1.2, LONG_PROMPTS],
    "gpt-5.5": [5, 30, LONG_PROMPTS],
    "gpt-5.5-pro": [30, 180],
    "gpt-5.4": [2.5, 15, LONG_PROMPTS],
    "gpt-5.4-pro": [30, 180],
    "gpt-5.4-mini": [0.75, 4.5],
    "gpt-5.4-nano": [0.2, 1.25],
    "gpt-5.3-codex-spark": [1.75, 14],
    "gpt-5.3-codex": [1.75, 14],
    "gpt-5.2": [1.75, 14],
    "gpt-5.2-codex": [1.75, 14],
    "gpt-5.1": [1.07, 8.5],
    "gpt-5.1-codex": [1.07, 8.5],
    "gpt-5.1-codex-max": [1.25, 10],
    "gpt-5.1-codex-mini": [0.25, 2],
    "gpt-5": [1.07, 8.5],
    "gpt-5-codex": [1.07, 8.5],
    "gpt-5-nano": [0.05, 0.4],
  },
}

/** Go is a subscription: these rates measure usage against the plan's monthly allowance. */
const OPENCODE_GO: PriceList = {
  url: "https://opencode.ai/docs/go/",
  note: "Counts toward your Go plan’s monthly allowance.",
  rates: {
    "glm-5.3-flash": [0.15, 0.5],
    "glm-5.3": [1.4, 4.4],
    "glm-5.2": [1.4, 4.4],
    "kimi-k3": [3, 15],
    "kimi-k2.7-code": [0.95, 4],
    "kimi-k2.6": [0.95, 4],
    "longcat-2.0": [0.3, 1.2],
    "longcat-2.5-preview-free": FREE,
    "mimo-v2.6-flash": [0.14, 0.28],
    "mimo-v2.6-pro": [0.435, 0.87],
    "mimo-v2.5": [0.14, 0.28],
    "mimo-v2.5-pro": [0.435, 0.87],
    "minimax-m3": [0.3, 1.2],
    "minimax-m2.7": [0.3, 1.2],
    "muse-spark-1.3-contributor": [0.1, 0.2],
    "muse-spark-1.2-contributor": [0.1, 0.2],
    "qwen3.8-max": [2, 6],
    "qwen3.8-flash": [0.15, 0.47],
    "qwen3.7-plus": [0.4, 1.6, LONG_PROMPTS],
    "deepseek-v4.1-flash": [0.15, 0.6, DEEPSEEK_PEAK],
    "deepseek-v4-pro": [0.66, 1.98, DEEPSEEK_PEAK],
    "deepseek-v4-flash": [0.15, 0.6, DEEPSEEK_PEAK],
    "deepseek-v4-flash-vision-exp": [0.15, 0.6, DEEPSEEK_PEAK],
    "hy4-preview": [0.834, 2.501],
    hy3: [0.14, 0.58],
    "space-bunny-free": FREE,
    "grok-4.7": [2, 6, LONG_PROMPTS],
    "grok-4.6": [2, 6, LONG_PROMPTS],
    "gpt-6-luna": [0.1, 0.5, LONG_PROMPTS],
    "gpt-5.6-luna": [0.2, 1.2, LONG_PROMPTS],
  },
}

function priceList(provider: ProviderId, options: Record<string, string>): PriceList | null {
  switch (provider) {
    case "openai":
      return OPENAI
    case "anthropic":
      return ANTHROPIC
    case "deepseek":
      return DEEPSEEK
    case "alibaba":
      return options.region === "intl" ? ALIBABA_INTL : null
    case "zhipu":
      return options.platform === "bigmodel" ? BIGMODEL : ZAI
    case "opencode":
      return options.plan === "go" ? OPENCODE_GO : OPENCODE_ZEN
    default:
      return null
  }
}

/** Dated snapshots share their alias's price: "-2026-06-08", "-20251001", "-0902". */
const SNAPSHOT_SUFFIX = /-(\d{4}-\d{2}-\d{2}|\d{8}|\d{4})$/

export function listedPrice(
  provider: ProviderId,
  modelId: string,
  options: Record<string, string>,
): ModelPricing | undefined {
  const list = priceList(provider, options)
  if (!list) return undefined
  const lookup = (id: string) => (Object.hasOwn(list.rates, id) ? list.rates[id] : undefined)
  const id = modelId.toLowerCase()
  const rate = lookup(id) ?? lookup(id.replace(SNAPSHOT_SUFFIX, ""))
  if (!rate) return undefined

  const [input, output, detail] = rate
  const notes = [detail?.note, list.note].filter((note): note is string => Boolean(note))
  return {
    input,
    output,
    ...(list.currency && { currency: list.currency }),
    ...(detail?.from && { from: true }),
    ...(notes.length > 0 && { notes }),
    listed: { url: list.url, checkedOn: PRICES_CHECKED_ON },
  }
}

/** Adds the published price to a model the provider's API didn't price. */
export function withListedPrice(model: ModelInfo, options: Record<string, string>): ModelInfo {
  if (model.pricing) return model
  const pricing = listedPrice(model.provider, model.id, options)
  if (!pricing) return model
  const free = pricing.input === 0 && pricing.output === 0
  // "Ling 3.1 Flash Free" → "Ling 3.1 Flash"; the menu shows a Free badge instead.
  const name = free ? model.name.replace(/\s+free$/i, "") || model.name : model.name
  return { ...model, name, pricing }
}
