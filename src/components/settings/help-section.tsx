"use client"

import { ArrowUpRight } from "lucide-react"
import Link from "next/link"
import { Kbd } from "@/components/ui/kbd"
import { publicEnv } from "@/lib/env"
import { useModKey } from "@/lib/hooks"
import { PROVIDER_LIST } from "@/lib/providers/registry"
import { SettingsGroup, SettingsSection } from "./primitives"

const TROUBLESHOOTING = [
  {
    q: "My API key is rejected",
    a: "Check that you copied the whole key with no spaces, that it hasn't been revoked, and — for Alibaba Cloud and Zhipu — that the region or platform matches where the key was created. Use Test on the provider card to check again.",
  },
  {
    q: "A reply stopped partway",
    a: "Either you pressed stop, the connection dropped, or the model reached its length limit. Use Continue under the reply to pick up where it left off, or Regenerate to start over.",
  },
  {
    q: "A model I expect isn't listed",
    a: "Nebula lists the models your key can access, as reported by the provider. New models can take a few minutes to appear; reopen the model menu to refresh. Some accounts need extra verification with the provider before certain models are available.",
  },
  {
    q: "I'm seeing rate-limit or quota errors",
    a: "Those limits come from your provider account. Wait a moment, choose another model, or raise your limits or balance in the provider's console.",
  },
  {
    q: "Who can read my conversations?",
    a: "Only you can access them in Nebula. The provider you choose processes each message to generate a reply, under its own privacy policy. See Privacy and data for details.",
  },
]

export function HelpSection() {
  const mod = useModKey()
  const shortcuts = [
    { keys: [mod, "K"], label: "Search conversations" },
    { keys: [mod, "Shift", "O"], label: "New chat" },
    { keys: [mod, "Shift", "S"], label: "Collapse or expand the sidebar" },
    { keys: ["Shift", "Esc"], label: "Focus the message box" },
    { keys: ["Enter"], label: "Send message" },
    { keys: ["Shift", "Enter"], label: "New line" },
    { keys: ["Esc"], label: "Close a menu or dialog" },
  ]

  return (
    <SettingsSection title="Help" description="Everything you need to get going.">
      <SettingsGroup title="Getting started">
        <ol className="flex flex-col gap-4">
          {[
            {
              title: "Connect a provider",
              body: (
                <>
                  Open{" "}
                  <Link href="/settings/providers" className="font-medium text-accent hover:underline">
                    AI providers
                  </Link>{" "}
                  and paste an API key from any supported provider.
                </>
              ),
            },
            { title: "Choose a model", body: "Use the model menu at the bottom of the message box. Search to find one quickly." },
            { title: "Ask anything", body: "Type a message and press Enter. Attach text files with the paperclip." },
          ].map((step, index) => (
            <li key={step.title} className="grid grid-cols-[28px_1fr] gap-3">
              <span className="flex size-7 items-center justify-center rounded-full bg-mist text-sm font-semibold tabular-nums">{index + 1}</span>
              <div>
                <p className="font-medium">{step.title}</p>
                <p className="mt-0.5 text-md text-fg-muted">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </SettingsGroup>

      <SettingsGroup title="Keyboard shortcuts">
        <dl className="divide-y divide-line rounded-lg border border-line">
          {shortcuts.map((shortcut) => (
            <div key={shortcut.label} className="flex items-center justify-between gap-4 px-4 py-2.5">
              <dt className="text-md text-fg">{shortcut.label}</dt>
              <dd className="flex shrink-0 gap-1">
                {shortcut.keys.map((key) => (
                  <Kbd key={key}>{key}</Kbd>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </SettingsGroup>

      <SettingsGroup title="Where to get API keys">
        <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {PROVIDER_LIST.map((provider) => (
            <li key={provider.id}>
              <a href={provider.keyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-md text-fg hover:text-accent">
                {provider.name}
                <ArrowUpRight className="size-3.5 text-fg-subtle" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </SettingsGroup>

      <SettingsGroup title="Troubleshooting">
        <div className="divide-y divide-line border-y border-line">
          {TROUBLESHOOTING.map((item) => (
            <details key={item.q} className="group py-3">
              <summary className="flex select-none list-none items-center justify-between gap-4 rounded-xs text-md font-medium [&::-webkit-details-marker]:hidden">
                {item.q}
                <span className="text-lg leading-none text-fg-subtle transition-transform group-open:rotate-45" aria-hidden="true">
                  +
                </span>
              </summary>
              <p className="mt-2 text-md text-fg-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </SettingsGroup>

      {publicEnv.repoUrl && (
        <SettingsGroup title="Feedback">
          <p className="text-md text-fg-muted">
            Found a bug or have an idea?{" "}
            <a href={`${publicEnv.repoUrl}/issues`} target="_blank" rel="noopener noreferrer" className="font-medium text-accent hover:underline">
              Open an issue on GitHub
            </a>
            .
          </p>
        </SettingsGroup>
      )}
    </SettingsSection>
  )
}
