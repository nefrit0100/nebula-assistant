import type { CookieOptionsWithName } from "@supabase/ssr"
import { publicEnv } from "@/lib/env"

/**
 * Session cookie attributes for every Supabase client (server, proxy, browser).
 * Secure whenever the site is served over HTTPS, SameSite=Lax always. They can't be
 * HttpOnly: the browser client reads the session to call the Data API, which RLS
 * scopes to the signed-in user.
 */
export const SESSION_COOKIE_OPTIONS: CookieOptionsWithName = {
  path: "/",
  sameSite: "lax",
  secure: publicEnv.siteUrl.startsWith("https://"),
}
