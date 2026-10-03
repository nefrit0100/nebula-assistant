import "server-only"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { publicEnv } from "@/lib/env"
import { SESSION_COOKIE_OPTIONS } from "./cookies"
import type { Database } from "./database.types"

/**
 * Request-scoped Supabase client acting as the signed-in user. All reads and
 * writes go through RLS, so the database enforces ownership regardless of the
 * IDs a request supplies.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseKey, {
    cookieOptions: SESSION_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // The proxy refreshes sessions, so this is safe to ignore.
        }
      },
    },
  })
}
