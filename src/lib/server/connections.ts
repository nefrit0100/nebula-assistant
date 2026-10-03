import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { normalizeProviderOptions } from "@/lib/providers/registry"
import { isProviderId, type ProviderConnection } from "@/lib/providers/types"
import type { Database } from "@/lib/supabase/database.types"

export const CONNECTION_COLUMNS =
  "provider_id, key_hint, options, status, last_verified_at, last_error, updated_at" as const

type ConnectionRow = {
  provider_id: string
  key_hint: string
  options: unknown
  status: string
  last_verified_at: string | null
  last_error: string | null
  updated_at: string
}

export function toConnection(row: ConnectionRow): ProviderConnection | null {
  if (!isProviderId(row.provider_id)) return null
  return {
    provider: row.provider_id,
    keyHint: row.key_hint,
    options: normalizeProviderOptions(row.provider_id, row.options as Record<string, unknown>),
    status: row.status === "valid" || row.status === "invalid" ? row.status : "unverified",
    lastVerifiedAt: row.last_verified_at,
    lastError: row.last_error,
    updatedAt: row.updated_at,
  }
}

/** The caller's connections — metadata only; the ciphertext column isn't even selectable. */
export async function listConnections(supabase: SupabaseClient<Database>): Promise<ProviderConnection[]> {
  const { data } = await supabase.from("provider_credentials").select(CONNECTION_COLUMNS)
  return (data ?? []).map(toConnection).filter((connection): connection is ProviderConnection => connection !== null)
}
