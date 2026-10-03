"use client"

import { ShieldCheck } from "lucide-react"
import { PROVIDER_LIST } from "@/lib/providers/registry"
import { useWorkspaceState } from "@/lib/workspace/context"
import { SettingsSection } from "./primitives"
import { ProviderCard } from "./provider-card"

export function ProvidersSection() {
  const connections = useWorkspaceState((state) => state.connections)
  const connectedCount = connections.length

  return (
    <SettingsSection
      title="AI providers"
      description="Nebula uses your own API keys. Connect any provider below, then pick its models in any chat."
    >
      <div className="flex items-start gap-3 rounded-lg bg-canvas px-4 py-3.5">
        <ShieldCheck className="mt-0.5 size-[18px] shrink-0 text-accent" aria-hidden="true" />
        <p className="text-sm leading-relaxed text-fg-muted">
          Keys are encrypted with AES-256 before they’re stored and can’t be read back by your browser. They’re
          decrypted only on Nebula’s server to call the provider you chose. Usage is billed to your provider account.
        </p>
      </div>

      <div>
        <p className="mb-3 text-md text-fg-muted">
          {connectedCount === 0
            ? "No providers connected yet."
            : `${connectedCount} of ${PROVIDER_LIST.length} providers connected.`}
        </p>
        <ul className="flex flex-col gap-3">
          {PROVIDER_LIST.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              connection={connections.find((connection) => connection.provider === provider.id) ?? null}
            />
          ))}
        </ul>
      </div>
    </SettingsSection>
  )
}
