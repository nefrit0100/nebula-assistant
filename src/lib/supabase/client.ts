"use client"

import type { SupabaseClient } from "@supabase/supabase-js"
import { publicEnv } from "@/lib/env"
import type { Database } from "./database.types"

let clientPromise: Promise<SupabaseClient<Database>> | null = null

/**
 * Lazily created browser client. supabase-js is ~60 KB gzipped, and the browser
 * only needs it when the user acts (rename, search, sign out…), so it's loaded
 * on first use instead of with the page. Every query it makes is constrained by RLS.
 */
export function getSupabaseBrowserClient(): Promise<SupabaseClient<Database>> {
  clientPromise ??= import("@supabase/ssr").then(
    ({ createBrowserClient }) => createBrowserClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseKey),
    (error: unknown) => {
      // A failed chunk load (offline, a deploy mid-session) shouldn't stick: retry on the next call.
      clientPromise = null
      throw error
    },
  )
  return clientPromise
}
