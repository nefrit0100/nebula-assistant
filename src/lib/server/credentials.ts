import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { ProviderError } from "@/lib/providers/server"
import type { ProviderContext } from "@/lib/providers/server/types"
import { normalizeProviderOptions } from "@/lib/providers/registry"
import type { ProviderId } from "@/lib/providers/types"
import type { Database } from "@/lib/supabase/database.types"
import { decryptSecret } from "./secrets"

/**
 * Loads and decrypts the caller's credential for one provider. The RPC filters
 * by auth.uid(), and the AAD binds the ciphertext to (userId, provider), so a
 * request can only ever unlock its own key.
 */
export async function loadProviderContext(
  supabase: SupabaseClient<Database>,
  userId: string,
  provider: ProviderId,
): Promise<ProviderContext> {
  const { data, error } = await supabase.rpc("get_provider_secret", { p_provider_id: provider })
  if (error) throw new ProviderError("unknown", "Could not load the saved credential.")
  const row = data?.[0]
  if (!row) throw new ProviderError("provider_not_configured")

  let apiKey: string
  try {
    apiKey = await decryptSecret(row.secret_ciphertext, userId, provider)
  } catch (error) {
    // A missing or changed NEBULA_ENCRYPTION_KEY lands here too: say which in the server log.
    console.error("[credentials] decrypt failed:", error instanceof Error ? error.message : error)
    throw new ProviderError("credential_unreadable")
  }
  const options = normalizeProviderOptions(provider, row.options as Record<string, unknown>)
  return { apiKey, options }
}

/** Provider ids the caller has saved credentials for (metadata only). */
export async function listConnectedProviders(supabase: SupabaseClient<Database>): Promise<ProviderId[]> {
  const { data } = await supabase.from("provider_credentials").select("provider_id")
  return (data ?? []).map((row) => row.provider_id as ProviderId)
}
