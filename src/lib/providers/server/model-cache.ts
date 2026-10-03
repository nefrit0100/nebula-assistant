import "server-only"

import { createHash } from "node:crypto"
import { catalogModels, findCatalogEntry, humanizeModelId } from "../catalog"
import type { ModelInfo, ProviderId } from "../types"
import type { ModelListing } from "./types"

type Entry<T> = { value: T; expires: number }

/** Small in-memory TTL cache. Per-instance; correctness never depends on a hit. */
class TtlCache<T> {
  private store = new Map<string, Entry<T>>()
  constructor(private readonly ttlMs: number, private readonly maxEntries = 500) {}

  get(key: string): T | undefined {
    const hit = this.store.get(key)
    if (!hit) return undefined
    if (hit.expires < Date.now()) {
      this.store.delete(key)
      return undefined
    }
    return hit.value
  }

  set(key: string, value: T) {
    if (this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next().value
      if (oldest !== undefined) this.store.delete(oldest)
    }
    this.store.set(key, { value, expires: Date.now() + this.ttlMs })
  }
}

const listingCache = new TtlCache<ModelListing>(10 * 60_000)

/** Cache key derived from a hash of the credential — the key itself is never stored. */
export function credentialCacheKey(provider: ProviderId, apiKey: string, options: Record<string, string>) {
  return createHash("sha256").update(`${provider}\0${apiKey}\0${JSON.stringify(options)}`).digest("hex")
}

export async function cachedListing(key: string, load: () => Promise<ModelListing>): Promise<ModelListing> {
  const hit = listingCache.get(key)
  if (hit) return hit
  const value = await load()
  // Don't pin a degraded listing for the full TTL.
  if (!value.partial) listingCache.set(key, value)
  return value
}

const publicCache = new TtlCache<unknown>(30 * 60_000, 20)

/** Caches unauthenticated catalog responses (OpenRouter, OpenCode) across users. */
export async function cachedPublic<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = publicCache.get(key) as T | undefined
  if (hit) return hit
  const value = await load()
  publicCache.set(key, value)
  return value
}

/**
 * Merges live model ids with curated metadata: curated (featured) models first,
 * then everything the provider reports, deduplicated. Discovered models carry
 * catalog metadata when the id matches and nothing otherwise.
 */
export function mergeWithCatalog(provider: ProviderId, discoveredIds: string[] | null): ModelListing {
  const curated = catalogModels(provider)
  if (!discoveredIds) return { models: curated, partial: true }

  const available = new Set(discoveredIds)
  // Curated entries the key can't see are dropped once we have a live list.
  const models: ModelInfo[] = curated.filter((model) => available.has(model.id))
  const seen = new Set(models.map((model) => model.id))

  for (const id of [...discoveredIds].sort(compareModelIds)) {
    if (seen.has(id)) continue
    seen.add(id)
    const entry = findCatalogEntry(id)
    models.push(
      entry
        ? { ...entry, provider, source: "catalog", featured: false }
        : { id, provider, name: humanizeModelId(id), capabilities: {}, source: "provider" },
    )
  }
  return { models, partial: false }
}

/** Newest-looking ids first: higher version numbers sort earlier. */
function compareModelIds(a: string, b: string) {
  return b.localeCompare(a, undefined, { numeric: true, sensitivity: "base" })
}
