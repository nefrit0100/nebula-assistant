import { getAdapter, ProviderError } from "@/lib/providers/server"
import { toApiError } from "@/lib/providers/errors"
import { withListedPrice } from "@/lib/providers/pricing"
import { isProviderId, type ProviderModels } from "@/lib/providers/types"
import { authenticate, json, jsonError, rateLimit } from "@/lib/server/api"
import { listConnectedProviders, loadProviderContext } from "@/lib/server/credentials"

/** Models available to the caller, grouped by connected provider. */
export async function GET(request: Request) {
  const auth = await authenticate()
  if (auth instanceof Response) return auth
  const { viewer, supabase } = auth
  // Listings are cached per key, but a forced refresh still reaches the providers.
  if (!(await rateLimit(supabase, "models", 30, 60))) return jsonError("nebula_rate_limited", 429)

  const only = new URL(request.url).searchParams.get("provider")
  if (only && !isProviderId(only)) return jsonError("not_found", 404, "Unknown provider.")

  const connected = await listConnectedProviders(supabase)
  const targets = only ? connected.filter((provider) => provider === only) : connected

  const providers = await Promise.all(
    targets.map(async (provider): Promise<ProviderModels> => {
      try {
        const context = await loadProviderContext(supabase, viewer.id, provider)
        const listing = await getAdapter(provider).listModels(context)
        const models = listing.models.map((model) => withListedPrice(model, context.options))
        return { provider, models, partial: listing.partial, error: null }
      } catch (error) {
        const code = error instanceof ProviderError ? error.code : "unknown"
        return { provider, models: [], partial: true, error: toApiError(code) }
      }
    }),
  )

  return json({ providers })
}
