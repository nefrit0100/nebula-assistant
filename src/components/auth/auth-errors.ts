import type { AuthError } from "@supabase/supabase-js"

/** Turns Supabase auth errors into plain, actionable sentences. */
export function describeAuthError(error: AuthError | Error | null | undefined): string {
  if (!error) return "Something went wrong. Try again."
  const code = "code" in error ? (error.code as string | undefined) : undefined
  const message = error.message ?? ""

  switch (code) {
    case "invalid_credentials":
      return "That email and password don't match. Check them and try again."
    case "email_not_confirmed":
      return "Confirm your email address first. We sent you a link when you signed up."
    case "user_already_exists":
    case "email_exists":
      return "An account with this email already exists. Sign in instead."
    case "weak_password":
      return "Choose a stronger password: at least 8 characters, ideally a mix of letters, numbers and symbols."
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Too many attempts. Wait a minute and try again."
    case "signup_disabled":
      return "New sign-ups are turned off for this workspace."
    case "same_password":
      return "Your new password must be different from the old one."
    case "session_expired":
    case "refresh_token_not_found":
      return "Your session expired. Sign in again."
    case "otp_expired":
      return "This link has expired. Request a new one."
    case "validation_failed":
      return "Check the email address and try again."
  }

  if (/fetch|network/i.test(message)) return "Can't reach the server. Check your connection and try again."
  if (/invalid login credentials/i.test(message)) return "That email and password don't match. Check them and try again."
  if (/email not confirmed/i.test(message)) return "Confirm your email address first. We sent you a link when you signed up."
  if (/password should be/i.test(message)) return "Choose a stronger password: at least 8 characters."
  return message || "Something went wrong. Try again."
}

/** Messages for ?error= codes set by the auth callback routes. */
export const CALLBACK_ERRORS: Record<string, string> = {
  link_invalid: "That sign-in link is invalid or has already been used. Request a new one.",
  link_expired: "That link has expired. Request a new one.",
  oauth_failed: "Google sign-in didn't complete. Try again.",
  oauth_denied: "Google sign-in was cancelled.",
  session_missing: "Open the link in the same browser you started from, or sign in with your password.",
}
