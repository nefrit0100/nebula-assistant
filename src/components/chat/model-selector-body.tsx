"use client"

import { Command } from "cmdk"
import { Brain, Check, Eye, RotateCw, Search, Wrench, X } from "lucide-react"
import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { Kbd } from "@/components/ui/kbd"
import { cn } from "@/lib/cn"
import { formatTokens } from "@/lib/dates"
import { CATALOG_VERIFIED_ON } from "@/lib/providers/catalog"
import { PROVIDER_LIST, PROVIDERS } from "@/lib/providers/registry"
import type { ModelInfo, ModelPricing, ModelRef, ProviderId } from "@/lib/providers/types"
import { useActions, useWorkspaceState } from "@/lib/workspace/context"

type FilterKey = "free" | "vision" | "reasoning" | "tools"

/** Filters only appear when at least one connected model reports the property. */
const FILTERS: { key: FilterKey; label: string; test: (model: ModelInfo) => boolean }[] = [
  { key: "free", label: "Free", test: isFree },
  { key: "vision", label: "Vision", test: (model) => model.capabilities.vision === true },
  { key: "reasoning", label: "Reasoning", test: (model) => model.capabilities.reasoning === true },
  { key: "tools", label: "Tool use", test: (model) => model.capabilities.tools === true },
]

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
  const [filters, setFilters] = useState<FilterKey[]>([])
  const [highlighted, setHighlighted] = useState(selected ? keyOf(selected) : "")
  const listRef = useRef<HTMLDivElement>(null)

  const sources = useMemo(
    () =>
      PROVIDER_LIST.filter((provider) => connected.includes(provider.id)).map((provider) => ({
        provider,
        entry: models.providers.find((entry) => entry.provider === provider.id),
      })),
    [connected, models.providers],
  )

  const offered = useMemo(
    () => FILTERS.filter((filter) => sources.some(({ entry }) => entry?.models.some(filter.test))),
    [sources],
  )

  const groups = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
    const active = FILTERS.filter((filter) => filters.includes(filter.key))
    return sources.map(({ provider, entry }) => ({
      provider,
      entry,
      models: (entry?.models ?? []).filter(
        (model) => active.every((filter) => filter.test(model)) && matches(model, provider.name, terms),
      ),
    }))
  }, [sources, query, filters])

  const visible = useMemo(() => {
    const map = new Map<string, ModelInfo>()
    for (const group of groups) for (const model of group.models) map.set(keyOf(model), model)
    return map
  }, [groups])

  // Keep the highlight on a visible row so the details pane never goes blank while filtering.
  const value = visible.has(highlighted) ? highlighted : (visible.keys().next().value ?? "")
  const detail = visible.get(value) ?? null
  const loading = models.status === "loading" && models.providers.length === 0
  const failed = models.status === "error" && models.providers.length === 0
  const total = visible.size
  const filtering = query.trim() !== "" || filters.length > 0

  // Bring the current model into view once the list has loaded.
  useEffect(() => {
    if (loading) return
    listRef.current?.querySelector<HTMLElement>('[cmdk-item][aria-selected="true"]')?.scrollIntoView({ block: "center" })
  }, [loading])

  function toggleFilter(key: FilterKey) {
    setFilters((current) => (current.includes(key) ? current.filter((k) => k !== key) : [...current, key]))
    listRef.current?.scrollTo({ top: 0 })
  }

  function clearAll() {
    setQuery("")
    setFilters([])
  }

  return (
    <Command
      shouldFilter={false}
      loop
      value={value}
      onValueChange={setHighlighted}
      label="Choose a model"
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex shrink-0 items-center gap-2.5 border-b border-line pl-4 pr-2">
        <Search className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
        <Command.Input
          autoFocus={twoPane}
          value={query}
          onValueChange={setQuery}
          placeholder="Search models"
          className="h-12 min-w-0 flex-1 bg-transparent text-md text-fg outline-none placeholder:text-fg-subtle"
        />
        {models.status === "loading" && models.providers.length > 0 && (
          <span className="text-xs text-fg-subtle">Refreshing…</span>
        )}
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-sm text-fg-subtle transition-colors hover:bg-hover hover:text-fg"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {offered.length > 0 && (
        <div
          role="group"
          aria-label="Filter models"
          className="scrollbar-none flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-line px-3 py-2"
        >
          {offered.map((filter) => {
            const on = filters.includes(filter.key)
            return (
              <button
                key={filter.key}
                type="button"
                aria-pressed={on}
                onClick={() => toggleFilter(filter.key)}
                // Enter would otherwise reach cmdk and pick the highlighted model.
                onKeyDown={(event) => event.key === "Enter" && event.stopPropagation()}
                className={cn(
                  "inline-flex h-7 shrink-0 items-center gap-1 rounded-full border px-3 text-sm font-medium transition-colors",
                  on
                    ? "border-accent/30 bg-mist text-fg"
                    : "border-line text-fg-muted hover:border-line-strong hover:text-fg",
                )}
              >
                {on && <Check className="-ml-0.5 size-3.5" aria-hidden="true" />}
                {filter.label}
              </button>
            )
          })}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <Command.List
          ref={listRef}
          className={cn(
            "min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-pb-1.5 scroll-pt-9 px-1.5 pb-1.5",
            twoPane && "border-r border-line",
          )}
        >
          {loading && <ModelSkeleton />}

          {failed && (
            <div className="px-3 py-10 text-center">
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

          {!loading && !failed && filtering && total === 0 && (
            <div className="px-3 py-10 text-center">
              <p className="text-md text-fg-muted">
                {query.trim() ? <>No models match “{query.trim()}”.</> : "No models match these filters."}
              </p>
              <button
                type="button"
                onClick={clearAll}
                className="mt-2 rounded-sm px-2 py-1 text-sm font-medium text-accent hover:bg-hover"
              >
                Clear search and filters
              </button>
            </div>
          )}

          {!loading &&
            groups.map(({ provider, entry, models: list }) => {
              // While filtering, hide providers with nothing to show.
              if (filtering && list.length === 0 && !entry?.error) return null
              return (
                <Command.Group
                  key={provider.id}
                  heading={
                    <>
                      <span>{provider.name}</span>
                      {list.length > 0 && <span className="tabular-nums">{list.length.toLocaleString()}</span>}
                    </>
                  }
                  className="[&_[cmdk-group-heading]]:sticky [&_[cmdk-group-heading]]:top-0 [&_[cmdk-group-heading]]:z-10 [&_[cmdk-group-heading]]:flex [&_[cmdk-group-heading]]:h-9 [&_[cmdk-group-heading]]:items-center [&_[cmdk-group-heading]]:justify-between [&_[cmdk-group-heading]]:bg-surface [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:text-sm [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-fg-subtle"
                >
                  {entry?.error && (
                    <p className="px-2.5 pb-2 text-sm text-danger">
                      {entry.error.message}{" "}
                      <Link href="/settings/providers" className="underline underline-offset-2">
                        Check provider
                      </Link>
                    </p>
                  )}
                  {!entry?.error && entry && list.length === 0 && !filtering && (
                    <p className="px-2.5 pb-2 text-sm text-fg-muted">No models available for this key.</p>
                  )}
                  {list.map((model) => (
                    <ModelRow
                      key={keyOf(model)}
                      model={model}
                      current={selected?.provider === model.provider && selected.model === model.id}
                      compact={!twoPane}
                      onSelect={() => onSelect({ provider: model.provider, model: model.id })}
                    />
                  ))}
                  {entry?.partial && !entry.error && list.length > 0 && !filtering && (
                    <p className="px-2.5 py-1.5 text-xs text-fg-subtle">Live model list unavailable; showing known models.</p>
                  )}
                </Command.Group>
              )
            })}
        </Command.List>

        {twoPane && <ModelDetail model={detail} />}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-line px-4 py-2 text-sm">
        {twoPane ? (
          <span className="flex items-center gap-3 text-xs text-fg-subtle" aria-hidden="true">
            <span className="flex items-center gap-1">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd>
              <span className="ml-0.5">to move</span>
            </span>
            <span className="flex items-center gap-1">
              <Kbd>↵</Kbd>
              <span className="ml-0.5">to select</span>
            </span>
          </span>
        ) : (
          <span className="text-fg-subtle">
            {loading ? "" : `${total.toLocaleString()} model${total === 1 ? "" : "s"}`}
          </span>
        )}
        <Link href="/settings/providers" className="rounded-xs font-medium text-fg-muted hover:text-fg">
          Manage providers
        </Link>
      </div>
    </Command>
  )
}

function ModelRow({
  model,
  current,
  compact,
  onSelect,
}: {
  model: ModelInfo
  current: boolean
  compact: boolean
  onSelect: () => void
}) {
  const context = formatTokens(model.contextWindow)
  return (
    <Command.Item
      value={keyOf(model)}
      onSelect={onSelect}
      className="flex min-h-[52px] cursor-pointer items-center gap-3 rounded-md px-2.5 py-1.5 outline-none data-[selected=true]:bg-hover"
    >
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-md text-fg">{model.name}</span>
          {isFree(model) && <FreeBadge />}
        </span>
        <span className="mt-0.5 block truncate text-xs text-fg-subtle">{model.id}</span>
      </span>
      {compact ? (
        <CapabilityIcons model={model} />
      ) : (
        context && <span className="shrink-0 text-xs tabular-nums text-fg-subtle">{context}</span>
      )}
      <span className="flex size-4 shrink-0 items-center justify-center">
        {current && <Check className="size-4 text-accent" aria-label="Current model" />}
      </span>
    </Command.Item>
  )
}

function ModelDetail({ model }: { model: ModelInfo | null }) {
  if (!model) {
    return (
      <div className="flex w-[268px] shrink-0 items-center justify-center p-6 text-center text-sm text-fg-subtle">
        Highlight a model to see its details.
      </div>
    )
  }
  const facts: { label: string; value: React.ReactNode; wide?: boolean }[] = []
  const context = formatTokens(model.contextWindow)
  const maxOutput = formatTokens(model.maxOutput)
  const pricing = model.pricing
  if (context) facts.push({ label: "Context window", value: `${context} tokens` })
  if (maxOutput) facts.push({ label: "Max output", value: `${maxOutput} tokens` })
  if (pricing && isFree(model)) {
    facts.push({ label: "Price", wide: true, value: <FreeBadge /> })
  } else if (pricing) {
    const price = (perMillion: number) => (
      <>
        {pricing.from && <span className="font-normal text-fg-muted">from </span>}
        {formatPrice(perMillion, pricing.currency)}
      </>
    )
    facts.push(
      { label: "Input per 1M", value: price(pricing.input) },
      { label: "Output per 1M", value: price(pricing.output) },
    )
  }
  const capabilities = [
    { key: "vision", label: "Vision", detail: "Understands images", icon: Eye, value: model.capabilities.vision },
    { key: "reasoning", label: "Reasoning", detail: "Thinks before answering", icon: Brain, value: model.capabilities.reasoning },
    { key: "tools", label: "Tool use", detail: "Supports function calling", icon: Wrench, value: model.capabilities.tools },
  ].filter((capability) => capability.value)
  const providerName = PROVIDERS[model.provider].name
  // Prices from a published list are credited separately from the model's other details.
  const detailsKnown = context || maxOutput || capabilities.length > 0 || (pricing && !pricing.listed)
  const detailsSource = !detailsKnown
    ? null
    : model.source === "provider"
      ? `Details reported by ${providerName}.`
      : `Details from the provider's documentation, verified ${CATALOG_VERIFIED_ON}.`

  return (
    <div className="flex w-[268px] shrink-0 flex-col overflow-y-auto p-5" aria-live="polite">
      <p className="text-sm text-fg-subtle">{providerName}</p>
      <p className="mt-0.5 text-lg font-semibold leading-snug tracking-[-0.01em] text-balance">{model.name}</p>
      <p className="mt-1 break-all text-xs text-fg-subtle">{model.id}</p>

      {facts.length > 0 && (
        <dl className="mt-5 grid grid-cols-2 gap-x-3 gap-y-4">
          {facts.map((fact) => (
            <div key={fact.label} className={cn(fact.wide && "col-span-2")}>
              <dt className="text-xs text-fg-subtle">{fact.label}</dt>
              <dd className="mt-0.5 text-md font-medium tabular-nums">{fact.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {pricing?.notes?.map((note) => (
        <p key={note} className="mt-2 text-xs leading-relaxed text-fg-muted">
          {note}
        </p>
      ))}

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
        {detailsSource}
        {pricing?.listed && (
          <>
            {detailsSource && " "}
            Prices from {providerName}’s{" "}
            <a
              href={pricing.listed.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-line-strong underline-offset-2 hover:text-fg"
            >
              pricing page
            </a>
            , checked {pricing.listed.checkedOn}.
          </>
        )}
        {!detailsSource && !pricing?.listed && "This provider doesn't publish details for this model."}
      </p>
    </div>
  )
}

function FreeBadge() {
  return (
    <span className="inline-flex h-[18px] shrink-0 items-center rounded-xs bg-mist px-1.5 text-[11px] font-semibold leading-none text-fg">
      Free
    </span>
  )
}

function CapabilityIcons({ model }: { model: ModelInfo }) {
  const context = formatTokens(model.contextWindow)
  return (
    <span className="flex shrink-0 items-center gap-1.5 text-xs text-fg-subtle">
      {model.capabilities.vision && <Eye className="size-3.5" aria-label="Vision" />}
      {model.capabilities.reasoning && <Brain className="size-3.5" aria-label="Reasoning" />}
      {context && <span className="tabular-nums">{context}</span>}
    </span>
  )
}

function ModelSkeleton() {
  return (
    <div className="flex flex-col gap-1 p-1" aria-label="Loading models" role="status">
      <div className="skeleton mb-2 mt-2.5 h-3.5 w-20" />
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="flex flex-col gap-1.5 px-1.5 py-2">
          <div className="skeleton h-3.5" style={{ width: `${62 - index * 6}%` }} />
          <div className="skeleton h-2.5 w-24" />
        </div>
      ))}
    </div>
  )
}

function isFree(model: ModelInfo) {
  return model.pricing?.input === 0 && model.pricing.output === 0
}

/** Every search word must appear in the name, id or provider; "free" also matches free models. */
function matches(model: ModelInfo, providerName: string, terms: string[]) {
  if (terms.length === 0) return true
  const haystack = `${model.name} ${model.id} ${providerName}${isFree(model) ? " free" : ""}`.toLowerCase()
  return terms.every((term) => haystack.includes(term))
}

/** $15 · $2.50 · $0.075 · ¥0.8 → ¥0.80 · < $0.01 */
function formatPrice(perMillion: number, currency: ModelPricing["currency"] = "USD") {
  const symbol = currency === "CNY" ? "¥" : "$"
  if (perMillion === 0) return "Free"
  if (perMillion < 0.01) return `< ${symbol}0.01`
  const whole = Number.isInteger(perMillion)
  return (
    symbol +
    perMillion.toLocaleString("en-US", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 3 })
  )
}

function keyOf(model: { provider: string; model?: string; id?: string }) {
  return `${model.provider}::${model.model ?? model.id}`
}
