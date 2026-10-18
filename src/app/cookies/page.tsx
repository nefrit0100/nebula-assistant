import type { Metadata } from "next"
import Link from "next/link"
import { LegalPage } from "@/components/legal/legal-page"
import { publicEnv } from "@/lib/env"
import { COOKIES } from "@/lib/legal"
import { pageMetadata } from "@/lib/seo"

export const metadata: Metadata = pageMetadata({
  title: "Cookie Policy",
  description:
    "Every cookie Nebula Assistant sets, what it's for and how long it lasts. Only necessary and preference cookies: no analytics or advertising.",
  path: "/cookies",
})

export default function CookiesPage() {
  return (
    <LegalPage title="Cookie Policy">
      <p>
        Cookies are small files a website stores in your browser. Nebula uses only cookies that are strictly necessary
        to provide the service, or that remember a choice you made. It doesn&apos;t use analytics, advertising or
        tracking cookies, so there is nothing to opt in to or out of. Nebula doesn&apos;t use local storage or other
        browser storage to identify you.
      </p>

      <h2>Cookies Nebula sets</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Purpose</th>
              <th scope="col">Duration</th>
            </tr>
          </thead>
          <tbody>
            {COOKIES.map((cookie) => (
              <tr key={cookie.name}>
                <td>
                  <code>{cookie.name}</code>
                </td>
                <td>{cookie.purpose}</td>
                <td>{cookie.duration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>All of them are first-party: only this site can read them, and they are never shared with anyone.</p>

      {publicEnv.turnstileSiteKey && (
        <>
          <h2>Bot check</h2>
          <p>
            The sign-in, sign-up and password-reset pages include Cloudflare Turnstile, which checks that a person is
            making the request. It runs on <code>challenges.cloudflare.com</code> and is covered by Cloudflare&apos;s{" "}
            <a href="https://www.cloudflare.com/turnstile-privacy-policy/" target="_blank" rel="noopener noreferrer">
              Turnstile privacy addendum
            </a>
            , which describes the signals it processes as strictly necessary for security.
          </p>
        </>
      )}

      <h2>Managing cookies</h2>
      <p>
        You can delete or block cookies in your browser&apos;s settings. Blocking the session cookie signs you out and
        prevents signing in; the other cookies only remember preferences.
      </p>
      <p>
        See the <Link href="/privacy">Privacy Policy</Link> for how Nebula handles the rest of your data.
      </p>
    </LegalPage>
  )
}
