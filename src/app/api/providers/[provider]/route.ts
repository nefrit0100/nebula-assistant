import { z } from "zod"
import { getAdapter, ProviderError } from "@/lib/providers/server"
import { normalizeProviderOptions } from "@/lib/providers/registry"
import { isProviderId } from "@/lib/providers/types"
import { authenticate, json, jsonError, parseBody, rateLimit } from "@/lib/server/api"
import { CONNECTION_COLUMNS, toConnection } from "@/lib/server/connections"
import { loadProviderContext } from "@/lib/server/credentials"
import { encryptSecret, keyHint } from "@/lib/server/secrets"
import type { Json } from "@/lib/supabase/database.types"
import { validateAlibabaEndpoint } from "@/lib/providers/server/adapters/compatible-providers"

const SaveSchema = z.object({
  /** Omit to keep the saved key and only change options. */
  apiKey: z
    .string()
    .trim()
    .min(8, "That key looks too short.")
    .max(1000)
    .regex(/^[\x21-\x7e]+$/, "API keys can't contain spaces or special characters.")
    .optional(),
  options: z.record(z.string(), z.string().max(500)).optional(),
})

/** Save (verify → encrypt → upsert) a provider credential. */
export async function PUT(request: Request, ctx: RouteContext<"/api/providers/[provider]">) {
  const { provider } = await ctx.params
  if (!isProviderId(provider)) return jsonError("not_found", 404, "Unknown provider.")

  const auth = await authenticate()
  if (auth instanceof Response) return auth
  const { viewer, supabase } = auth

  const body = await parseBody(request, SaveSchema)
  if (body instanceof Response) return body
  if (!(await rateLimit(supabase, "credentials", 20, 60))) return jsonError("nebula_rate_limited", 429)

  const options = normalizeProviderOptions(provider, body.options)
  if (provider === "alibaba" && options.region === "custom") {
    const endpoint = validateAlibabaEndpoint(options.baseUrl)
    if (!endpoint) {
      return jsonError("invalid_input", 400, "The workspace endpoint must be an https://…aliyuncs.com/compatible-mode/v1 URL.")
    }
    options.baseUrl = endpoint
  } else {
    delete options.baseUrl
  }

  let apiKey = body.apiKey
  if (!apiKey) {
    try {
      apiKey = (await loadProviderContext(supabase, viewer.id, provider)).apiKey
    } catch (error) {
      return jsonError(error instanceof ProviderError ? error.code : "unknown", 400)
    }
  }

  // Verify before storing so a mistyped key is caught immediately.
  let status: "valid" | "unverified" = "valid"
  let lastError: string | null = null
  try {
    await getAdapter(provider).verify({ apiKey, options })
  } catch (error) {
    const failure = error instanceof ProviderError ? error : new ProviderError("unknown")
    if (failure.code === "invalid_api_key" || failure.code === "permission_denied" || failure.code === "invalid_input") {
      return jsonError(failure.code, 400, failure.detail)
    }
    // The provider was unreachable or errored for another reason: keep the key, flag it.
    status = "unverified"
    lastError = failure.detail?.slice(0, 300) ?? failure.code
  }

  let secretCiphertext: string | undefined
  if (body.apiKey) {
    try {
      secretCiphertext = await encryptSecret(apiKey, viewer.id, provider)
    } catch (error) {
      // Usually a missing or malformed NEBULA_ENCRYPTION_KEY; the message names it (never the key).
      console.error("[providers] encrypt failed:", error instanceof Error ? error.message : error)
      return jsonError("unknown", 500, "Could not save the credential.")
    }
  }

  const now = new Date().toISOString()
  const record = {
    key_hint: keyHint(apiKey),
    options: options as Json,
    status,
    last_verified_at: status === "valid" ? now : null,
    last_error: lastError,
    ...(secretCiphertext ? { secret_ciphertext: secretCiphertext } : {}),
  }

  // Explicit insert-or-update: clients hold no UPDATE grant on user_id/provider_id,
  // which an upsert's DO UPDATE clause would require.
  const update = () =>
    supabase.from("provider_credentials").update(record).eq("provider_id", provider).select(CONNECTION_COLUMNS).single()

  const { data: existing } = await supabase
    .from("provider_credentials")
    .select("provider_id")
    .eq("provider_id", provider)
    .maybeSingle()

  let result = existing || !record.secret_ciphertext
    ? await update()
    : await supabase
        .from("provider_credentials")
        .insert({ ...record, secret_ciphertext: record.secret_ciphertext, user_id: viewer.id, provider_id: provider })
        .select(CONNECTION_COLUMNS)
        .single()
  // A concurrent save from another tab won the insert race.
  if (result.error?.code === "23505") result = await update()

  if (result.error || !result.data) {
    console.error("[providers] save failed", result.error?.code)
    return jsonError("unknown", 500, "Could not save the credential.")
  }
  return json({ connection: toConnection(result.data) })
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/providers/[provider]">) {
  const { provider } = await ctx.params
  if (!isProviderId(provider)) return jsonError("not_found", 404, "Unknown provider.")

  const auth = await authenticate()
  if (auth instanceof Response) return auth

  const { error } = await auth.supabase.from("provider_credentials").delete().eq("provider_id", provider)
  if (error) return jsonError("unknown", 500, "Could not remove the credential.")
  return json({ ok: true })
}
