"use client"

import Link from "next/link"
import { Kbd } from "@/components/ui/kbd"
import { SIGN_IN_HELP, shortcutList, TROUBLESHOOTING, type HelpItem } from "@/lib/help"
import { useModKey } from "@/lib/hooks"
import { MIN_AGE } from "@/lib/legal"
import { PROVIDER_LIST } from "@/lib/providers/registry"

const SECTIONS = [
  { id: "what-is-nebula", title: "What Nebula is" },
  { id: "getting-started", title: "Getting started" },
  { id: "providers", title: "Providers and API keys" },
  { id: "features", title: "Features" },
  { id: "shortcuts", title: "Keyboard shortcuts" },
  { id: "signing-in", title: "Help with signing in" },
  { id: "troubleshooting", title: "Troubleshooting" },
  { id: "your-data", title: "Your data" },
] as const

type Variant = "page" | "dialog"

/**
 * The user guide, shown at /docs and in a dialog on the sign-in pages. In the dialog,
 * headings sit one level lower (the dialog title is the h2) and links open in a new
 * tab so a half-filled sign-up form isn't lost.
 */
export function DocsContent({ variant }: { variant: Variant }) {
  const shortcuts = shortcutList(useModKey())
  const H = variant === "page" ? "h2" : "h3"
  const external = { target: "_blank", rel: "noopener noreferrer" } as const
  const internal = variant === "dialog" ? external : {}
  const title = (id: (typeof SECTIONS)[number]["id"]) => SECTIONS.find((section) => section.id === id)!.title

  return (
    <div className="prose-nebula [&_h2]:mt-10 [&_h2]:scroll-mt-6 [&_h3]:scroll-mt-6">
      <nav aria-label="On this page">
        <p className="mb-2! text-sm font-medium text-fg-muted">On this page</p>
        <ul>
          {SECTIONS.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`}>{section.title}</a>
            </li>
          ))}
        </ul>
      </nav>

      <H id="what-is-nebula">{title("what-is-nebula")}</H>
      <p>
        Nebula is a free, open-source AI assistant where you bring your own API keys. You connect the AI providers you
        already have an account with, and chat with their models in one place. Nebula has no paid plans: each provider
        bills you directly for the messages you send through it.
      </p>

      <H id="getting-started">{title("getting-started")}</H>
      <ol>
        <li>
          <strong>Create an account</strong> with your email address and a password of at least 8 characters, then open
          the confirmation link we email you. If this deployment offers it, you can continue with Google instead. You
          must be at least {MIN_AGE} years old.
        </li>
        <li>
          <strong>Connect a provider.</strong> In <strong>Settings → AI providers</strong>, paste an API key. Nebula
          checks the key without spending tokens, encrypts it and never shows it again.
        </li>
        <li>
          <strong>Choose a model</strong> from the model menu at the bottom of the message box. Search to find one
          quickly; prices, where published, are shown per million tokens.
        </li>
        <li>
          <strong>Ask anything.</strong> Type a message and press Enter. Attach text files with the paperclip.
        </li>
      </ol>

      <H id="providers">{title("providers")}</H>
      <p>Create a key in your provider&apos;s console, then paste it in Settings → AI providers.</p>
      <ul>
        {PROVIDER_LIST.map((provider) => (
          <li key={provider.id}>
            <strong>{provider.name}</strong>: {provider.description}{" "}
            <a href={provider.keyUrl} {...external}>
              Get a key
            </a>
          </li>
        ))}
      </ul>
      <p>
        The model list comes from each provider and shows what your key can use. Prices in the model menu are copied
        from providers&apos; published price lists, with the date they were checked; your provider&apos;s bill is what
        counts.
      </p>

      <H id="features">{title("features")}</H>
      <ul>
        <li>
          <strong>Conversations:</strong> replies stream as they&apos;re written. Stop, regenerate, continue a reply
          that was cut off, edit and resend your message, copy, and rate replies.
        </li>
        <li>
          <strong>Files:</strong> attach text files to a message. Long replies such as whole code files arrive as file
          cards you can copy, download or open; HTML and Markdown files get a live preview.
        </li>
        <li>
          <strong>Projects:</strong> group conversations and give them shared instructions that are sent with every
          chat in the project.
        </li>
        <li>
          <strong>Search:</strong> find any conversation by its content.
        </li>
        <li>
          <strong>Personalization:</strong> tell Nebula what to call you, what to know about you and how to respond.
          This is sent to your provider with each message.
        </li>
        <li>
          <strong>Appearance:</strong> light, dark or system theme, and three text sizes.
        </li>
      </ul>

      <H id="shortcuts">{title("shortcuts")}</H>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Action</th>
              <th scope="col">Keys</th>
            </tr>
          </thead>
          <tbody>
            {shortcuts.map((shortcut) => (
              <tr key={shortcut.label}>
                <td>{shortcut.label}</td>
                <td>
                  <span className="inline-flex gap-1">
                    {shortcut.keys.map((key) => (
                      <Kbd key={key}>{key}</Kbd>
                    ))}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <H id="signing-in">{title("signing-in")}</H>
      <QuestionList items={SIGN_IN_HELP} variant={variant} />

      <H id="troubleshooting">{title("troubleshooting")}</H>
      <QuestionList items={TROUBLESHOOTING} variant={variant} />

      <H id="your-data">{title("your-data")}</H>
      <p>
        Nebula stores your account, conversations, projects and settings, and your API keys encrypted. When you send a
        message, it goes to the provider you chose, which processes it under its own terms. In{" "}
        <strong>Settings → Privacy and data</strong> you can export your conversations, delete them, or delete your
        account.
      </p>
      <p>
        Read the{" "}
        <Link href="/privacy" {...internal}>
          Privacy Policy
        </Link>
        ,{" "}
        <Link href="/terms" {...internal}>
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/cookies" {...internal}>
          Cookie Policy
        </Link>
        .
      </p>
    </div>
  )
}

function QuestionList({ items, variant }: { items: HelpItem[]; variant: Variant }) {
  const Q = variant === "page" ? "h3" : "h4"
  return (
    <>
      {items.map((item) => (
        <div key={item.q}>
          <Q>{item.q}</Q>
          <p>{item.a}</p>
        </div>
      ))}
    </>
  )
}
