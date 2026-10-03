import { getAdapter, ProviderError } from "@/lib/providers/server"
import { toApiError } from "@/lib/providers/errors"
import { isProviderId } from "@/lib/providers/types"
import { authenticate, json, jsonError, rateLimit } from "@/lib/server/api"
import { CONNECTION_COLUMNS, toConnection } from "@/lib/server/connections"
import { loadProviderContext } from "@/lib/server/credentials"

/** Re-verifies the saved credential and records the outcome. */
export async function POST(_request: Request, ctx: RouteContext<"/api/providers/[provider]/test">) {
  const { provider } = await ctx.params
  if (!isProviderId(provider)) return jsonError("not_found", 404, "Unknown provider.")

  const auth = await authenticate()
  if (auth instanceof Response) return auth
  const { viewer, supabase } = auth
  if (!(await rateLimit(supabase, "credentials", 20, 60))) return jsonError("nebula_rate_limited", 429)

  let failure: ProviderError | null = null
  try {
    const context = await loadProviderContext(supabase, viewer.id, provider)
    await getAdapter(provider).verify(context)
  } catch (error) {
    failure = error instanceof ProviderError ? error : new ProviderError("unknown")
    if (failure.code === "provider_not_configured" || failure.code === "credential_unreadable") {
      return jsonError(failure.code, 400)
    }
  }

  const invalid = failure && (failure.code === "invalid_api_key" || failure.code === "permission_denied")
  const { data } = await supabase
    .from("provider_credentials")
    .update({
      status: failure ? (invalid ? "invalid" : "unverified") : "valid",
      last_verified_at: failure ? undefined : new Date().toISOString(),
      last_error: failure ? (failure.detail ?? failure.code).slice(0, 300) : null,
    })
    .eq("provider_id", provider)
    .select(CONNECTION_COLUMNS)
    .single()

  return json({
    ok: !failure,
    error: failure ? toApiError(failure.code, failure.detail) : null,
    connection: data ? toConnection(data) : null,
  })
}
