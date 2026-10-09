"use client"

import { ArrowUpRight } from "lucide-react"
import Link from "next/link"
import { Kbd } from "@/components/ui/kbd"
import { publicEnv } from "@/lib/env"
import { shortcutList, TROUBLESHOOTING } from "@/lib/help"
import { useModKey } from "@/lib/hooks"
import { PROVIDER_LIST } from "@/lib/providers/registry"
import { SettingsGroup, SettingsSection } from "./primitives"

export function HelpSection() {
  const shortcuts = shortcutList(useModKey())

  return (
    <SettingsSection
      title="Help"
      description={
        <>
          Everything you need to get going. The{" "}
          <Link href="/docs" className="font-medium text-accent hover:underline">
            full docs
          </Link>{" "}
          cover every feature.
        </>
      }
    >
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
