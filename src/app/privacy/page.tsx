import type { Metadata } from "next"
import { LegalPage, OperatorNote } from "@/components/legal/legal-page"

export const metadata: Metadata = {
  title: "Privacy",
  description: "How Nebula Assistant handles your account, conversations and API keys.",
}

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy" updated="October 2, 2026">
      <OperatorNote />

      <h2>What Nebula stores</h2>
      <ul>
        <li>
          <strong>Account:</strong> your email address, and if you sign in with Google, your name and profile photo
          as provided by Google.
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
      </ul>
      <p>
        Data is stored in a Supabase Postgres database. Row-level security ensures each account can only read and
        change its own records.
      </p>

      <h2>What AI providers receive</h2>
      <p>
        Nebula is &ldquo;bring your own key&rdquo;. When you send a message, Nebula&apos;s server sends the request to
        the provider you selected using your key. The request includes the conversation so far, your personalization
        settings, any project instructions and attached files. Each provider processes this data under its own terms
        and privacy policy and bills your account for usage. Nebula does not control how providers retain or use
        requests; review your provider&apos;s policies.
      </p>

      <h2>What Nebula does not do</h2>
      <ul>
        <li>It does not sell your data or show advertising.</li>
        <li>It does not include third-party analytics or tracking scripts.</li>
        <li>It does not use your conversations to train models.</li>
      </ul>

      <h2>Cookies</h2>
      <p>
        Nebula uses essential cookies only: to keep you signed in, and to remember your theme and sidebar
        preference.
      </p>

      <h2>Your choices</h2>
      <p>
        In <strong>Settings → Privacy and data</strong> you can export all of your conversations, delete them, or
        permanently delete your account. Removing a provider in <strong>Settings → AI providers</strong> deletes the
        saved key immediately.
      </p>
    </LegalPage>
  )
}
