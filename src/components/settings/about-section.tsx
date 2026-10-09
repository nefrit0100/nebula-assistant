"use client"

import Link from "next/link"
import { LogoMark } from "@/components/brand/logo"
import { publicEnv } from "@/lib/env"
import { SettingsGroup, SettingsSection } from "./primitives"

const VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0"

export function AboutSection() {
  return (
    <SettingsSection title="About">
      <div className="flex items-center gap-4">
        <LogoMark size={48} />
        <div>
          <p className="text-lg font-semibold tracking-[-0.01em]">Nebula Assistant</p>
          <p className="text-md text-fg-muted">Version {VERSION}</p>
        </div>
      </div>

      <SettingsGroup title="Free and open source">
        <p className="text-md text-fg-muted">
          Nebula is free software released under the MIT License. You can read the code, host your own copy and
          contribute improvements.
          {publicEnv.repoUrl && (
            <>
              {" "}
              <a href={publicEnv.repoUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-accent hover:underline">
                View the source code
              </a>
              .
            </>
          )}
        </p>
      </SettingsGroup>

      <SettingsGroup title="Who handles what">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-line p-4">
            <p className="font-medium">Nebula</p>
            <ul className="mt-2 flex flex-col gap-1.5 text-sm text-fg-muted">
              <li>Your account and sign-in</li>
              <li>Storing conversations and settings</li>
              <li>Encrypting and safekeeping your keys</li>
              <li>Sending your messages to the provider you pick</li>
            </ul>
          </div>
          <div className="rounded-lg border border-line p-4">
            <p className="font-medium">Your AI provider</p>
            <ul className="mt-2 flex flex-col gap-1.5 text-sm text-fg-muted">
              <li>Running the model and generating replies</li>
              <li>Processing your messages under its own terms</li>
              <li>Billing your account for usage</li>
              <li>Rate limits and model availability</li>
            </ul>
          </div>
        </div>
      </SettingsGroup>

      <SettingsGroup title="Open-source credits">
        <ul className="flex flex-col gap-1.5 text-sm text-fg-muted">
          <li>Instrument Sans and JetBrains Mono fonts: SIL Open Font License 1.1</li>
          <li>Lucide icons: ISC License</li>
          <li>KaTeX (math rendering and fonts) and Shiki (code highlighting): MIT License</li>
        </ul>
        <p className="mt-2 text-sm text-fg-muted">
          The full list ships with the source code in THIRD_PARTY_NOTICES.md.
        </p>
      </SettingsGroup>

      <SettingsGroup title="Legal">
        {publicEnv.operator && (
          <p className="mb-3 text-md text-fg-muted">
            Operated by {publicEnv.operator.name}
            {publicEnv.operator.email && (
              <>
                {" "}
                ·{" "}
                <a href={`mailto:${publicEnv.operator.email}`} className="text-fg hover:text-accent">
                  {publicEnv.operator.email}
                </a>
              </>
            )}
          </p>
        )}
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-md">
          <li>
            <Link href="/privacy" className="text-fg hover:text-accent">
              Privacy Policy
            </Link>
          </li>
          <li>
            <Link href="/terms" className="text-fg hover:text-accent">
              Terms of Service
            </Link>
          </li>
          <li>
            <Link href="/cookies" className="text-fg hover:text-accent">
              Cookie Policy
            </Link>
          </li>
        </ul>
      </SettingsGroup>
    </SettingsSection>
  )
}
