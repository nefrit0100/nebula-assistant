import type { Metadata } from "next"
import Link from "next/link"
import { PublicPage } from "@/components/site/public-page"
import { publicEnv } from "@/lib/env"
import { PROVIDER_LIST } from "@/lib/providers/registry"

export const metadata: Metadata = {
  title: "About",
  description: "What Nebula Assistant is, who it's for, and how it keeps your API keys safe.",
  alternates: { canonical: "/about" },
}

export default function AboutPage() {
  const operator = publicEnv.operator
  return (
    <PublicPage>
      <h1 className="text-3xl font-semibold tracking-[-0.025em]">About Nebula</h1>
      <p className="mt-2 text-md text-fg-muted">A free, open-source AI assistant for the models you already pay for.</p>
      <div className="prose-nebula mt-10 [&_h2]:mt-10">
        <p>
          Nebula Assistant is a web workspace for chatting with AI models. Instead of selling its own model access, it
          lets you connect API keys from the providers you already use — {PROVIDER_LIST.map((p) => p.name).join(", ")}{" "}
          — and talk to any model those keys can reach, all in one place.
        </p>

        <h2>Who it&apos;s for</h2>
        <p>
          Nebula is for people who want one calm, fast interface across several AI providers, and who prefer paying
          each provider per use through their own API account over a separate monthly subscription for every chat
          app. Usage is billed by the provider under its own terms; Nebula itself is free.
        </p>

        <h2>How it works</h2>
        <ul>
          <li>Create an account with your email address, then add an API key in Settings → AI providers.</li>
          <li>Nebula checks the key with the provider without spending tokens, then stores it encrypted.</li>
          <li>
            Pick a model and start a conversation. Replies stream in with Markdown, highlighted code and math, and you
            can organize conversations into projects with shared instructions.
          </li>
        </ul>

        <h2>Your keys and data</h2>
        <p>
          API keys are encrypted with AES-256-GCM before they are stored and are only decrypted on the server, at the
          moment it calls the provider you chose. They are never sent back to your browser. Conversations and settings
          are stored in a database where every row is locked to its owner. The{" "}
          <Link href="/privacy" className="text-accent underline underline-offset-2">
            Privacy Policy
          </Link>{" "}
          has the details.
        </p>

        <h2>Open source</h2>
        <p>
          Nebula is released under the MIT license. Anyone can read the code, check how it handles keys, or run their
          own copy.
          {publicEnv.repoUrl && (
            <>
              {" "}
              The source code is on{" "}
              <a href={publicEnv.repoUrl} className="text-accent underline underline-offset-2">
                GitHub
              </a>
              .
            </>
          )}
        </p>

        <h2>Who runs this site</h2>
        <p>
          {operator ? (
            <>
              This deployment is operated by {operator.name}
              {operator.address && <>, {operator.address}</>}.
            </>
          ) : (
            <>The operator of this deployment hasn&apos;t published their name and address yet.</>
          )}{" "}
          To get in touch, see{" "}
          <Link href="/contact" className="text-accent underline underline-offset-2">
            Contact
          </Link>
          . To get started, read the{" "}
          <Link href="/docs" className="text-accent underline underline-offset-2">
            docs
          </Link>{" "}
          or{" "}
          <Link href="/signup" className="text-accent underline underline-offset-2">
            create a free account
          </Link>
          .
        </p>
      </div>
    </PublicPage>
  )
}
