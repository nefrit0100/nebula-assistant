import "server-only"

import { publicEnv } from "@/lib/env"

export type AuthSettings = {
  google: boolean
  emailEnabled: boolean
  signupDisabled: boolean
  emailAutoconfirm: boolean
}

const FALLBACK: AuthSettings = { google: false, emailEnabled: true, signupDisabled: false, emailAutoconfirm: false }

/**
 * Reads the project's public auth configuration so the UI only offers sign-in
 * methods that are actually enabled (no dead "Continue with Google" button).
 */
export async function getAuthSettings(): Promise<AuthSettings> {
  try {
    const response = await fetch(`${publicEnv.supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: publicEnv.supabaseKey },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(4000),
    })
    if (!response.ok) return FALLBACK
    const json = (await response.json()) as {
      external?: { google?: boolean; email?: boolean }
      disable_signup?: boolean
      mailer_autoconfirm?: boolean
    }
    return {
      google: Boolean(json.external?.google),
      emailEnabled: json.external?.email !== false,
      signupDisabled: Boolean(json.disable_signup),
      emailAutoconfirm: Boolean(json.mailer_autoconfirm),
    }
  } catch {
    return FALLBACK
  }
}
