import { publicEnv } from "@/lib/env"
import { THEME_COOKIE } from "@/lib/settings"
import { SIDEBAR_COOKIE } from "@/lib/workspace/constants"

/** Accounts are for people this age or older: the highest age of digital consent in the EU (GDPR Art. 8). */
export const MIN_AGE = 16

/** Date shown on the Privacy, Terms and Cookies pages. Update it whenever their content changes. */
export const LEGAL_UPDATED = "October 8, 2026"

/** Remembers that the cookie notice was dismissed. */
export const COOKIE_NOTICE_COOKIE = "nebula-cookie-notice"

/** Supabase's session cookie name: `sb-<project-ref>-auth-token` (see @supabase/ssr). */
const sessionCookie = `sb-${new URL(publicEnv.supabaseUrl).hostname.split(".")[0]}-auth-token`

export type CookieEntry = { name: string; purpose: string; duration: string; setBy: string }

/** Every cookie Nebula sets. All are strictly necessary or remember a choice the visitor made. */
export const COOKIES: CookieEntry[] = [
  {
    name: sessionCookie,
    purpose:
      "Keeps you signed in. Large sessions are split across several cookies with .0, .1, … appended to the name.",
    duration: "400 days, renewed while you use Nebula; removed when you log out",
    setBy: "Nebula (Supabase Auth)",
  },
  {
    name: `${sessionCookie}-code-verifier`,
    purpose:
      "A one-time security code that links a sign-up confirmation, password reset or Google sign-in back to this browser.",
    duration: "Until the sign-in finishes",
    setBy: "Nebula (Supabase Auth)",
  },
  {
    name: THEME_COOKIE,
    purpose: "Remembers the theme you picked, so pages load in the right colors.",
    duration: "1 year",
    setBy: "Nebula",
  },
  {
    name: SIDEBAR_COOKIE,
    purpose: "Remembers whether you collapsed the sidebar.",
    duration: "1 year",
    setBy: "Nebula",
  },
  {
    name: COOKIE_NOTICE_COOKIE,
    purpose: "Remembers that you dismissed the cookie notice.",
    duration: "1 year",
    setBy: "Nebula",
  },
]
