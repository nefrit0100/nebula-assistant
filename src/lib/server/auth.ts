import "server-only"

import { cache } from "react"
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export type Viewer = {
  id: string
  email: string | null
  authProviders: string[]
  userMetadata: Record<string, unknown>
}

/**
 * Verifies the session JWT (signature checked via getClaims) once per request.
 * Identity is always derived here — never from a client-supplied user id.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims?.sub) return null
  const claims = data.claims
  const appMetadata = (claims.app_metadata ?? {}) as { providers?: unknown; provider?: unknown }
  const providers = Array.isArray(appMetadata.providers)
    ? appMetadata.providers.filter((value): value is string => typeof value === "string")
    : typeof appMetadata.provider === "string"
      ? [appMetadata.provider]
      : []
  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
    authProviders: providers,
    userMetadata: (claims.user_metadata ?? {}) as Record<string, unknown>,
  }
})

/** For pages: redirect signed-out visitors to the auth gateway. */
export async function requireViewer(nextPath?: string): Promise<Viewer> {
  const viewer = await getViewer()
  if (!viewer) {
    redirect(nextPath ? `/?next=${encodeURIComponent(nextPath)}` : "/")
  }
  return viewer
}
