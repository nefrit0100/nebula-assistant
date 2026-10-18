import type { Metadata } from "next"
import Link from "next/link"
import { ContactOperator, LegalPage } from "@/components/legal/legal-page"
import { publicEnv } from "@/lib/env"
import { MIN_AGE } from "@/lib/legal"
import { pageMetadata } from "@/lib/seo"

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy",
  description:
    "How Nebula Assistant handles your account, conversations and encrypted API keys, what AI providers receive, and how to export or delete your data.",
  path: "/privacy",
})

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        This policy explains what this Nebula deployment stores about you, why, who else receives it, and how to get
        a copy or have it deleted. The operator of this deployment (see above) is responsible for your data (the
        &ldquo;controller&rdquo;).
      </p>

      <h2>What Nebula stores</h2>
      <ul>
        <li>
          <strong>Account:</strong> your email address and a hashed password. If you sign up with Google, Nebula copies
          your name and profile photo from Google into your profile; you can change or remove both in Settings.
        </li>
        <li>
          <strong>Content:</strong> your conversations, messages, attached text files, projects and their
          instructions.
        </li>
        <li>
          <strong>Preferences:</strong> personalization (such as what Nebula should call you), appearance and chat
          settings.
        </li>
        <li>
          <strong>Provider API keys:</strong> encrypted with AES-256-GCM using a key held only by the server. Keys
          are never sent back to your browser; only a short hint (for example <code>sk-••••91A2</code>) is shown.
        </li>
        <li>
          <strong>Reply details:</strong> which model answered, the token counts the provider reports, error codes,
          and any thumbs-up or thumbs-down you give a reply. Ratings stay in your account; they aren&apos;t sent
          anywhere.
        </li>
        <li>
          <strong>Abuse protection:</strong> short-lived per-account request counters used for rate limits.
        </li>
      </ul>
      <p>
        Nebula doesn&apos;t ask for your age, phone number, address or payment details, and its code doesn&apos;t log
        IP addresses or browser details. The hosting provider and Supabase may keep standard request logs (which
        include IP addresses) to run and secure their services.
      </p>
      <p>
        Data is stored in a Supabase Postgres database. Row-level security ensures each account can only read and
        change its own records. The operator, who runs the server and database, can technically access stored data.
      </p>

      <h2>Why it&apos;s used</h2>
      <ul>
        <li>
          To provide the service you signed up for: your account, your conversations and sending your messages to the
          provider you choose (performance of a contract).
        </li>
        <li>
          To keep the service secure, for example rate limits and the optional bot check on sign-in (legitimate
          interest in preventing abuse).
        </li>
      </ul>

      <h2>What AI providers receive</h2>
      <p>
        Nebula is &ldquo;bring your own key&rdquo;. When you send a message, Nebula&apos;s server sends the request to
        the provider you selected using your key. The request includes the conversation so far, your personalization
        settings, any project instructions and attached files. Each provider processes this data under its own terms
        and privacy policy and bills your account for usage. Nebula does not control how providers retain or use
        requests; review your provider&apos;s policies.
      </p>

      <h2>Other services involved</h2>
      <ul>
        <li>
          <strong>Supabase</strong> hosts the database and handles sign-in and account emails.
        </li>
        <li>
          <strong>The hosting provider</strong> of this deployment runs Nebula&apos;s server.
        </li>
        <li>
          <strong>Google</strong>, only if you choose &ldquo;Continue with Google&rdquo;: Google confirms your identity
          and shares your email, name and profile photo. Your profile photo then loads from Google&apos;s servers.
        </li>
        {publicEnv.turnstileSiteKey && (
          <li>
            <strong>Cloudflare Turnstile</strong> checks that sign-in, sign-up and password-reset requests come from a
            person. It loads from <code>challenges.cloudflare.com</code> on those pages and processes browser signals
            under Cloudflare&apos;s{" "}
            <a href="https://www.cloudflare.com/turnstile-privacy-policy/" target="_blank" rel="noopener noreferrer">
              Turnstile privacy addendum
            </a>
            .
          </li>
        )}
      </ul>
      <p>
        Fonts are served by Nebula itself, so pages make no requests to font services. Images that appear in AI
        replies aren&apos;t loaded automatically; they&apos;re shown as links you can choose to open.
      </p>

      <h2>What Nebula does not do</h2>
      <ul>
        <li>It does not sell your data or show advertising.</li>
        <li>It does not include analytics, advertising or tracking scripts.</li>
        <li>It does not use your conversations to train models.</li>
        <li>
          It does not send marketing email. The only emails are the ones you trigger: confirming your address and
          resetting your password.
        </li>
      </ul>

      <h2>Cookies</h2>
      <p>
        Nebula uses only cookies that are needed to keep you signed in or that remember a choice you made, such as your
        theme. There are no tracking or advertising cookies. The <Link href="/cookies">Cookie Policy</Link> lists each
        one.
      </p>

      <h2>How long data is kept</h2>
      <p>
        Your data is kept until you delete it or delete your account. Deleting removes it from the database
        immediately. Copies in the database host&apos;s backups expire on the backup schedule. Data a provider received
        is kept under that provider&apos;s policy.
      </p>

      <h2>Children</h2>
      <p>
        Nebula is not meant for children. You must be at least {MIN_AGE} years old to create an account, and Nebula
        doesn&apos;t knowingly collect data from anyone younger. If you believe a child under {MIN_AGE} has an account,{" "}
        <ContactOperator /> and it will be deleted.
      </p>

      <h2>Your rights</h2>
      <p>
        Depending on where you live, you can ask for access to your data, a copy of it, correction, deletion,
        restriction of processing, or object to processing, and you can complain to your data-protection authority.
        Most of this is available directly in Settings:
      </p>
      <ul>
        <li>
          <strong>Access and copy:</strong> <strong>Settings → Privacy and data → Export</strong> downloads your
          conversations, messages and projects as JSON. Your profile and preferences are shown in Settings.
        </li>
        <li>
          <strong>Correction:</strong> edit your name, photo, personalization and projects in Settings.
        </li>
        <li>
          <strong>Deletion:</strong> see below.
        </li>
      </ul>
      <p>
        For anything else, <ContactOperator />.
      </p>

      <h2>Deleting your data</h2>
      <ul>
        <li>
          <strong>Settings → Privacy and data → Delete all</strong> removes every conversation and message.
        </li>
        <li>
          <strong>Settings → Privacy and data → Delete account</strong> permanently removes your account, provider
          keys, conversations, projects and settings.
        </li>
        <li>
          Removing a provider in <strong>Settings → AI providers</strong> deletes its saved key immediately.
        </li>
        <li>
          If you can&apos;t sign in, <ContactOperator /> from the email address on the account and ask for it to be
          deleted.
        </li>
      </ul>
      <p>
        Deleting your Nebula account doesn&apos;t delete data held by your AI providers or by Google; use their own
        settings for that.
      </p>

      <h2>Changes</h2>
      <p>When this policy changes, the date at the top changes too.</p>
    </LegalPage>
  )
}
