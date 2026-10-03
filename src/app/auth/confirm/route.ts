import type { EmailOtpType } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { safeNextPath } from "@/lib/urls"

const OTP_TYPES: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"]

/**
 * Token-hash verification for email links. Works across browsers and devices
 * (unlike the PKCE code flow). Enable it by pointing the Supabase email
 * templates at /auth/confirm — see README → "Email templates".
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl
  const tokenHash = url.searchParams.get("token_hash")
  const type = url.searchParams.get("type") as EmailOtpType | null
  const fallback = type === "recovery" ? "/reset-password" : "/app"
  const next = safeNextPath(url.searchParams.get("next"), fallback)

  if (tokenHash && type && OTP_TYPES.includes(type)) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) return NextResponse.redirect(new URL(next, url.origin))
    const target = new URL("/", url.origin)
    target.searchParams.set("error", error.code === "otp_expired" ? "link_expired" : "link_invalid")
    return NextResponse.redirect(target)
  }

  const target = new URL("/", url.origin)
  target.searchParams.set("error", "link_invalid")
  return NextResponse.redirect(target)
}
