import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { publicEnv } from "@/lib/env"
import { SESSION_COOKIE_OPTIONS } from "./cookies"

const PROTECTED_PREFIXES = ["/app", "/settings"]
const AUTH_ENTRY_PATHS = ["/", "/login", "/signup"]

/**
 * Refreshes the Supabase session cookie on every navigation and performs the
 * optimistic routing checks:
 *   - signed-out visitors to /app or /settings → /
 *   - signed-in visitors to the auth entry pages → /app
 * Pages and route handlers re-verify the session themselves; this is not the
 * only line of defense.
 */
export async function updateSession(request: NextRequest) {
  // Behind a TLS-terminating host, a plain-HTTP request means someone typed or
  // followed an http:// link: send them to HTTPS before anything else.
  if (publicEnv.siteUrl.startsWith("https://") && request.headers.get("x-forwarded-proto") === "http") {
    const secure = request.nextUrl.clone()
    secure.protocol = "https:"
    secure.port = ""
    return NextResponse.redirect(secure, 308)
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseKey, {
    cookieOptions: SESSION_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value)
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value)
      },
    },
  })

  // Do not run code between createServerClient and getClaims().
  const { data } = await supabase.auth.getClaims()
  const signedIn = Boolean(data?.claims?.sub)

  const { pathname, search } = request.nextUrl
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )

  if (!signedIn && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    url.search = ""
    url.searchParams.set("next", `${pathname}${search}`)
    return redirectWithCookies(url, response)
  }

  if (signedIn && AUTH_ENTRY_PATHS.includes(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = "/app"
    url.search = ""
    return redirectWithCookies(url, response)
  }

  return response
}

/** Redirect while preserving any refreshed auth cookies. */
function redirectWithCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url)
  for (const cookie of from.cookies.getAll()) redirect.cookies.set(cookie)
  return redirect
}
