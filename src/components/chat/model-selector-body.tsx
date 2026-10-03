"use client"

import { Command } from "cmdk"
import { Brain, Check, Eye, RotateCw, Search, Wrench } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"
import { cn } from "@/lib/cn"
import { formatTokens } from "@/lib/dates"
import { CATALOG_VERIFIED_ON } from "@/lib/providers/catalog"
import { PROVIDER_LIST, PROVIDERS } from "@/lib/providers/registry"
import type { ModelInfo, ModelRef, ProviderId } from "@/lib/providers/types"
import { useActions, useWorkspaceState } from "@/lib/workspace/context"

const INITIAL_LIMIT = 40

/** The model menu contents: loaded on demand (cmdk) by ModelSelector. */
export default function SelectorBody({
  selected,
  connected,
  twoPane,
  onSelect,
}: {
  selected: ModelRef | null
  connected: ProviderId[]
  twoPane: boolean
  onSelect: (ref: ModelRef) => void
}) {
  const models = useWorkspaceState((state) => state.models)
  const actions = useActions()
  const [query, setQuery] = useState("")
  const [highlighted, setHighlighted] = useState(selected ? keyOf(selected) : "")
  const needle = query.trim().toLowerCase()

  const groups = useMemo(() => {
    return PROVIDER_LIST.filter((provider) => connected.includes(provider.id)).map((provider) => {
      const entry = models.providers.find((p) => p.provider === provider.id)
      const all = entry?.models ?? []
      const matches = needle
        ? all.filter((m) => m.name.toLowerCase().includes(needle) || m.id.toLowerCase().includes(needle))
        : all
      const limited = !needle && matches.length > INITIAL_LIMIT ? matches.slice(0, INITIAL_LIMIT) : matches
      return { provider, entry, models: limited, hidden: matches.length - limited.length }
    })
  }, [connected, models.providers, needle])

  const byKey = useMemo(() => {
    const map = new Map<string, ModelInfo>()
    for (const group of groups) for (const model of group.models) map.set(keyOf(model), model)
    return map
  }, [groups])

  const loading = models.status === "loading" && models.providers.length === 0
  const totalShown = groups.reduce((sum, group) => sum + group.models.length, 0)
  const unconnected = PROVIDER_LIST.length - connected.length
  const detail = byKey.get(highlighted) ?? null

  return (
    <Command
      shouldFilter={false}
      loop
      value={highlighted}
      onValueChange={setHighlighted}
      label="Choose a model"
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex items-center gap-2.5 border-b border-line px-4">
        <Search className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
        <Command.Input
          autoFocus={twoPane}
          value={query}
          onValueChange={setQuery}
          placeholder="Search models…"
          className="h-12 min-w-0 flex-1 bg-transparent text-md text-fg outline-none placeholder:text-fg-subtle"
        />
        {models.status === "loading" && models.providers.length > 0 && (
          <span className="text-xs text-fg-subtle">Refreshing…</span>
        )}
      </div>

      <div className={cn("flex min-h-0 flex-1", twoPane && "h-[380px]")}>
        <Command.List className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5", twoPane && "max-w-[360px] border-r border-line")}>
          {loading && <ModelSkeleton />}
          {models.status === "error" && models.providers.length === 0 && (
            <div className="px-3 py-8 text-center">
              <p className="font-medium">Couldn’t load models.</p>
              <button
                type="button"
                onClick={() => actions.loadModels({ force: true })}
                className="mt-3 inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-sm font-medium text-accent hover:bg-hover"
              >
                <RotateCw className="size-3.5" aria-hidden="true" />
                Try again
              </button>
            </div>
          )}
          {!loading && needle && totalShown === 0 && models.status !== "error" && (
            <div className="px-3 py-8 text-center text-md text-fg-muted">No models match “{query.trim()}”.</div>
          )}

          {!loading &&
            groups.map(({ provider, entry, models: list, hidden }) => (
              <Command.Group
                key={provider.id}
                heading={provider.name}
                className="pb-1 [&_[cmdk-group-heading]]:flex [&_[cmdk-group-heading]]:h-8 [&_[cmdk-group-heading]]:items-center [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:text-sm [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-fg-subtle"
              >
                {entry?.error && (
                  <p className="px-2.5 pb-2 text-sm text-danger">
                    {entry.error.message}{" "}
                    <Link href="/settings/providers" className="underline underline-offset-2">
                      Check provider
                    </Link>
                  </p>
                )}
                {!entry?.error && list.length === 0 && !needle && entry && (
                  <p className="px-2.5 pb-2 text-sm text-fg-muted">No models available for this key.</p>
                )}
                {list.map((model) => {
                  const active = selected?.provider === model.provider && selected.model === model.id
                  return (
                    <Command.Item
                      key={keyOf(model)}
                      value={keyOf(model)}
                      onSelect={() => onSelect({ provider: model.provider, model: model.id })}
                      className="group flex min-h-12 cursor-pointer items-center gap-3 rounded-md px-2.5 py-1.5 outline-none data-[selected=true]:bg-hover"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-md text-fg">{model.name}</span>
                        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-fg-subtle">
                          <span className="truncate">{model.id}</span>
                          {!twoPane && <CapabilityIcons model={model} />}
                        </span>
                      </span>
                      {active && <Check className="size-4 shrink-0 text-accent" aria-label="Selected" />}
                    </Command.Item>
                  )
                })}
                {hidden > 0 && <p className="px-2.5 py-1.5 text-sm text-fg-subtle">Search to see {hidden} more models</p>}
                {entry?.partial && !entry.error && list.length > 0 && !needle && (
                  <p className="px-2.5 py-1.5 text-xs text-fg-subtle">Live model list unavailable; showing known models.</p>
                )}
              </Command.Group>
            ))}
        </Command.List>

        {twoPane && <ModelDetail model={detail} />}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5 text-sm">
        <span className="text-fg-subtle">
          {unconnected > 0 ? `${unconnected} more provider${unconnected === 1 ? "" : "s"} available` : "All providers connected"}
        </span>
        <Link href="/settings/providers" className="rounded-xs font-medium text-fg-muted hover:text-fg">
          Manage providers
        </Link>
      </div>
    </Command>
  )
}

function ModelDetail({ model }: { model: ModelInfo | null }) {
  if (!model) {
    return (
      <div className="hidden w-[260px] shrink-0 items-center justify-center p-6 text-center text-sm text-fg-subtle sm:flex">
        Highlight a model to see its details.
      </div>
    )
  }
  const specs = [
    { label: "Context window", value: formatTokens(model.contextWindow) },
    { label: "Max output", value: formatTokens(model.maxOutput) },
  ].filter((spec) => spec.value)
  const capabilities = [
    { key: "vision", label: "Vision", detail: "Understands images", icon: Eye, value: model.capabilities.vision },
    { key: "reasoning", label: "Reasoning", detail: "Thinks before answering", icon: Brain, value: model.capabilities.reasoning },
    { key: "tools", label: "Tool use", detail: "Supports function calling", icon: Wrench, value: model.capabilities.tools },
  ].filter((capability) => capability.value)
  const known = specs.length > 0 || capabilities.length > 0

  return (
    <div className="hidden w-[260px] shrink-0 flex-col overflow-y-auto p-5 sm:flex" aria-live="polite">
      <p className="text-sm text-fg-subtle">{PROVIDERS[model.provider].name}</p>
      <p className="mt-0.5 text-lg font-semibold leading-snug tracking-[-0.01em]">{model.name}</p>
      <p className="mt-1 break-all text-xs text-fg-subtle">{model.id}</p>

      {specs.length > 0 && (
        <dl className="mt-5 grid grid-cols-2 gap-3">
          {specs.map((spec) => (
            <div key={spec.label}>
              <dt className="text-xs text-fg-subtle">{spec.label}</dt>
              <dd className="mt-0.5 text-md font-medium tabular-nums">{spec.value} tokens</dd>
            </div>
          ))}
        </dl>
      )}

      {capabilities.length > 0 && (
        <ul className="mt-5 flex flex-col gap-2.5">
          {capabilities.map((capability) => (
            <li key={capability.key} className="flex items-start gap-2.5">
              <capability.icon className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
              <span>
                <span className="block text-md font-medium">{capability.label}</span>
                <span className="block text-sm text-fg-muted">{capability.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-auto pt-5 text-xs leading-relaxed text-fg-subtle">
        {!known
          ? "This provider doesn't publish details for this model."
          : model.source === "provider"
            ? `Details reported by ${PROVIDERS[model.provider].name}.`
            : `Details from the provider's documentation, verified ${CATALOG_VERIFIED_ON}.`}
      </p>
    </div>
  )
}

function CapabilityIcons({ model }: { model: ModelInfo }) {
  const context = formatTokens(model.contextWindow)
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      {model.capabilities.vision && <Eye className="size-3" aria-label="Vision" />}
      {model.capabilities.reasoning && <Brain className="size-3" aria-label="Reasoning" />}
      {context && <span className="tabular-nums">{context}</span>}
    </span>
  )
}

function ModelSkeleton() {
  return (
    <div className="flex flex-col gap-1 p-1" aria-label="Loading models" role="status">
      <div className="skeleton mb-2 h-3.5 w-20" />
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="flex flex-col gap-1.5 px-1.5 py-2">
          <div className="skeleton h-3.5" style={{ width: `${62 - index * 6}%` }} />
          <div className="skeleton h-2.5 w-24" />
        </div>
      ))}
    </div>
  )
}

function keyOf(model: { provider: string; model?: string; id?: string }) {
  return `${model.provider}::${model.model ?? model.id}`
}
