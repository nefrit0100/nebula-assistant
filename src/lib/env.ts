/**
 * Public configuration. Only NEXT_PUBLIC_* values may live here: this module is
 * imported by client components and is inlined into the browser bundle.
 * Server-only secrets are read in src/lib/server/env.ts.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing environment variable ${name}. See .env.example.`)
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
} as const

function normalizeRepoUrl(value: string | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === "https:" ? url.toString().replace(/\/+$/, "") : null
  } catch {
    return null
  }
}
