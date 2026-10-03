/**
 * Shared, client-safe provider types. Nothing here touches credentials or the
 * network; adapters live in src/lib/providers/server.
 */

export const PROVIDER_IDS = [
  "openai",
  "anthropic",
  "deepseek",
  "alibaba",
  "zhipu",
  "openrouter",
  "opencode",
] as const

export type ProviderId = (typeof PROVIDER_IDS)[number]

export function isProviderId(value: unknown): value is ProviderId {
  return typeof value === "string" && (PROVIDER_IDS as readonly string[]).includes(value)
}

/** Only capabilities confirmed by a catalog entry or the provider's own API are set. */
export type ModelCapabilities = {
  vision?: boolean
  reasoning?: boolean
  tools?: boolean
}

/** Per million tokens. Only set when the provider publishes the figure. */
export type ModelPricing = {
  input: number
  output: number
  /** Defaults to USD. */
  currency?: "USD" | "CNY"
  /** The lowest of several rates: longer prompts, thinking mode or peak hours cost more. */
  from?: boolean
  /** Short sentences shown with the price, e.g. when a higher rate applies. */
  notes?: string[]
  /** Set when the figure comes from the provider's published price list rather than its API. */
  listed?: { url: string; checkedOn: string }
}

export type ModelInfo = {
  id: string
  provider: ProviderId
  name: string
  contextWindow?: number
  maxOutput?: number
  capabilities: ModelCapabilities
  pricing?: ModelPricing
  /** Where the metadata came from — the UI only shows details it can attribute. */
  source: "catalog" | "provider"
  featured?: boolean
}

export type ProviderOptionChoice = { value: string; label: string; hint?: string }

export type ProviderOption =
  | {
      key: string
      label: string
      type: "select"
      choices: ProviderOptionChoice[]
      defaultValue: string
      help?: string
    }
  | {
      key: string
      label: string
      type: "url"
      placeholder: string
      help?: string
      /** Shown only when another option has this value, e.g. region = "custom". */
      visibleWhen?: { key: string; value: string }
    }

export type ProviderDefinition = {
  id: ProviderId
  name: string
  /** One sentence for the provider card. */
  description: string
  keyLabel: string
  keyPlaceholder: string
  /** Where users create a key. */
  keyUrl: string
  docsUrl: string
  options?: ProviderOption[]
}

export type ModelRef = { provider: ProviderId; model: string }

/** GET /api/models response entry. */
export type ProviderModels = {
  provider: ProviderId
  models: ModelInfo[]
  partial: boolean
  error: import("./errors").ApiErrorPayload | null
}

/** A provider credential as the client sees it: never the key itself. */
export type ProviderConnection = {
  provider: ProviderId
  keyHint: string
  options: Record<string, string>
  status: "unverified" | "valid" | "invalid"
  lastVerifiedAt: string | null
  lastError: string | null
  updatedAt: string
}
