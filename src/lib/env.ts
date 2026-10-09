/**
 * Public configuration. Only NEXT_PUBLIC_* values may live here: this module is
 * imported by client components and is inlined into the browser bundle.
 * Server-only secrets are read in src/lib/server/env.ts.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing environment variable ${name}. See README → "Environment variables".`)
  }
  return value
}

export const publicEnv = {
  supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseKey: required(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  ),
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, ""),
  repoUrl: normalizeRepoUrl(process.env.NEXT_PUBLIC_REPO_URL),
  /** Cloudflare Turnstile site key; when set, auth forms send a CAPTCHA token Supabase verifies. */
  turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || null,
  /** Who runs this deployment, shown on the legal pages. Null until the operator sets a name. */
  operator: operatorDetails(),
} as const

function operatorDetails() {
  const name = process.env.NEXT_PUBLIC_OPERATOR_NAME?.trim()
  if (!name) return null
  return {
    name,
    address: process.env.NEXT_PUBLIC_OPERATOR_ADDRESS?.trim() || null,
    email: process.env.NEXT_PUBLIC_OPERATOR_EMAIL?.trim() || null,
    registration: process.env.NEXT_PUBLIC_OPERATOR_REGISTRATION?.trim() || null,
  }
}

function normalizeRepoUrl(value: string | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === "https:" ? url.toString().replace(/\/+$/, "") : null
  } catch {
    return null
  }
}
