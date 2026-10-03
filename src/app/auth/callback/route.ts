import { NextResponse, type NextRequest } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { safeNextPath } from "@/lib/urls"

/**
 * PKCE callback for Google OAuth, email confirmation and password-recovery links:
 * exchanges the one-time code for a session cookie, then continues to `next`.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl
  const next = safeNextPath(url.searchParams.get("next"))
  const code = url.searchParams.get("code")
  const providerError = url.searchParams.get("error")

  const fail = (reason: string) => {
    const target = new URL("/", url.origin)
    target.searchParams.set("error", reason)
    return NextResponse.redirect(target)
  }

  if (providerError) {
    return fail(providerError === "access_denied" ? "oauth_denied" : "oauth_failed")
  }
  if (!code) return fail("link_invalid")

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error || !data.user) {
    // A missing code verifier means the link was opened in a different browser.
    if (error && /code verifier|code_verifier/i.test(error.message)) return fail("session_missing")
    if (error?.code === "otp_expired" || error?.code === "flow_state_expired") return fail("link_expired")
    return fail("link_invalid")
  }

  // Keep the profile photo in sync with the identity provider when the user hasn't set one.
  const meta = data.user.user_metadata as { avatar_url?: unknown; picture?: unknown; full_name?: unknown; name?: unknown }
  const avatar = typeof meta.avatar_url === "string" ? meta.avatar_url : typeof meta.picture === "string" ? meta.picture : null
  if (avatar?.startsWith("https://")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("avatar_url, display_name")
      .eq("id", data.user.id)
      .maybeSingle()
    if (profile && !profile.avatar_url) {
      const name = typeof meta.full_name === "string" ? meta.full_name : typeof meta.name === "string" ? meta.name : null
      await supabase
        .from("profiles")
        .update({ avatar_url: avatar, ...(profile.display_name ? {} : name ? { display_name: name.slice(0, 80) } : {}) })
        .eq("id", data.user.id)
    }
  }

  return NextResponse.redirect(new URL(next, url.origin))
}
