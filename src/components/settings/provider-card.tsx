"use client"

import { ArrowUpRight, CheckCircle2, CircleAlert, CircleDashed, XCircle } from "lucide-react"
import { useId, useState } from "react"
import { toast } from "sonner"
import { PasswordInput } from "@/components/auth/password-input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/field"
import { cn } from "@/lib/cn"
import { formatRelative } from "@/lib/dates"
import type { ApiErrorPayload } from "@/lib/providers/errors"
import { normalizeProviderOptions } from "@/lib/providers/registry"
import type { ProviderConnection, ProviderDefinition } from "@/lib/providers/types"
import { useActions } from "@/lib/workspace/context"

type ProviderCardProps = {
  provider: ProviderDefinition
  connection: ProviderConnection | null
}

type Mode = "idle" | "connect" | "edit"

export function ProviderCard({ provider, connection }: ProviderCardProps) {
  const actions = useActions()
  const formId = useId()
  const [mode, setMode] = useState<Mode>("idle")
  const [apiKey, setApiKey] = useState("")
  const [options, setOptions] = useState<Record<string, string>>(() =>
    normalizeProviderOptions(provider.id, connection?.options),
  )
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [error, setError] = useState<ApiErrorPayload | null>(null)

  const open = mode !== "idle"
  const replacingKey = mode === "connect"

  function start(next: Mode) {
    setMode(next)
    setApiKey("")
    setError(null)
    setOptions(normalizeProviderOptions(provider.id, connection?.options))
  }

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/providers/${provider.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}), options }),
      })
      const json = (await response.json()) as { connection?: ProviderConnection; error?: ApiErrorPayload }
      if (!response.ok || !json.connection) {
        setError(json.error ?? { code: "unknown", message: "Couldn't save this key." })
        return
      }
      actions.setConnection(json.connection)
      setMode("idle")
      setApiKey("")
      if (json.connection.status === "valid") toast.success(`${provider.name} connected`)
      else toast.warning(`${provider.name} saved, but not verified`, { description: "We couldn't reach the provider to check the key." })
    } catch {
      setError({ code: "network_error", message: "Connection interrupted. Try again." })
    } finally {
      setSaving(false)
    }
  }

  async function test() {
    setTesting(true)
    try {
      const response = await fetch(`/api/providers/${provider.id}/test`, { method: "POST" })
      const json = (await response.json()) as { ok?: boolean; error?: ApiErrorPayload | null; connection?: ProviderConnection | null }
      if (json.connection) actions.setConnection(json.connection)
      if (json.ok) toast.success(`${provider.name} is working`)
      else toast.error(json.error?.message ?? "The connection test failed", { description: json.error?.detail })
    } catch {
      toast.error("Connection interrupted. Try again.")
    } finally {
      setTesting(false)
    }
  }

  async function remove() {
    setRemoving(true)
    try {
      const response = await fetch(`/api/providers/${provider.id}`, { method: "DELETE" })
      if (!response.ok) throw new Error()
      actions.removeConnection(provider.id)
      setConfirmRemove(false)
      setMode("idle")
      toast.success(`${provider.name} disconnected`, { description: "The saved key was deleted." })
    } catch {
      toast.error(`Couldn't disconnect ${provider.name}`)
    } finally {
      setRemoving(false)
    }
  }

  const visibleOptions = (provider.options ?? []).filter(
    (option) => option.type === "select" || !option.visibleWhen || options[option.visibleWhen.key] === option.visibleWhen.value,
  )

  return (
    <li className={cn("rounded-xl border bg-bg transition-colors", open ? "border-line-strong" : "border-line")}>
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:gap-4 sm:p-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 className="text-md font-semibold text-fg">{provider.name}</h3>
            <StatusBadge connection={connection} />
          </div>
          <p className="mt-1 text-sm text-fg-muted">{provider.description}</p>
          {connection && (
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-subtle">
              <span className="font-mono text-xs text-fg-muted">{connection.keyHint}</span>
              {connection.lastVerifiedAt && <span>Verified {formatRelative(connection.lastVerifiedAt)}</span>}
              {describeOptions(provider, connection.options) && <span>{describeOptions(provider, connection.options)}</span>}
            </p>
          )}
          {connection?.lastError && connection.status !== "valid" && (
            <p className="mt-2 text-sm text-warning">{connection.lastError}</p>
          )}
        </div>
        {!open && (
          <div className="flex shrink-0 flex-wrap gap-2">
            {connection ? (
              <>
                <Button size="sm" variant="secondary" onClick={test} loading={testing}>
                  Test
                </Button>
                {provider.options?.length ? (
                  <Button size="sm" variant="secondary" onClick={() => start("edit")}>
                    Edit
                  </Button>
                ) : null}
                <Button size="sm" variant="secondary" onClick={() => start("connect")}>
                  Replace key
                </Button>
                <Button size="sm" variant="danger-ghost" onClick={() => setConfirmRemove(true)}>
                  Remove
                </Button>
              </>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => start("connect")}>
                Connect
              </Button>
            )}
          </div>
        )}
      </div>

      {open && (
        <form onSubmit={save} className="flex flex-col gap-4 border-t border-line px-4 pb-4 pt-4 sm:px-5 sm:pb-5" aria-label={`${provider.name} credentials`}>
          {replacingKey && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${formId}-key`} className="text-md font-medium">
                {provider.keyLabel}
              </label>
              <PasswordInput
                id={`${formId}-key`}
                autoFocus
                autoComplete="off"
                spellCheck={false}
                autoCapitalize="off"
                placeholder={provider.keyPlaceholder}
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                aria-describedby={`${formId}-key-help`}
                aria-invalid={error ? true : undefined}
              />
              <p id={`${formId}-key-help`} className="text-sm text-fg-muted">
                <a href={provider.keyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-medium text-accent hover:underline">
                  Get a key from {provider.name}
                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </a>
                . It’s encrypted before it’s stored and never shown again.
              </p>
            </div>
          )}

          {visibleOptions.map((option) =>
            option.type === "select" ? (
              <div key={option.key} className="flex flex-col gap-1.5">
                <label htmlFor={`${formId}-${option.key}`} className="text-md font-medium">
                  {option.label}
                </label>
                <select
                  id={`${formId}-${option.key}`}
                  value={options[option.key] ?? option.defaultValue}
                  onChange={(event) => setOptions((current) => ({ ...current, [option.key]: event.target.value }))}
                  className="h-10 w-full appearance-none rounded-md border border-line-control bg-bg bg-[length:16px] bg-[right_12px_center] bg-no-repeat px-3 pr-9 text-md text-fg focus:border-accent focus:outline-none focus:ring-[3px] focus:ring-accent/15"
                  style={{
                    backgroundImage:
                      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%237a8d95' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
                  }}
                >
                  {option.choices.map((choice) => (
                    <option key={choice.value} value={choice.value}>
                      {choice.label}
                      {choice.hint ? ` — ${choice.hint}` : ""}
                    </option>
                  ))}
                </select>
                {option.help && <p className="text-sm text-fg-muted">{option.help}</p>}
              </div>
            ) : (
              <div key={option.key} className="flex flex-col gap-1.5">
                <label htmlFor={`${formId}-${option.key}`} className="text-md font-medium">
                  {option.label}
                </label>
                <Input
                  id={`${formId}-${option.key}`}
                  type="url"
                  inputMode="url"
                  spellCheck={false}
                  placeholder={option.placeholder}
                  value={options[option.key] ?? ""}
                  onChange={(event) => setOptions((current) => ({ ...current, [option.key]: event.target.value }))}
                />
                {option.help && <p className="text-sm text-fg-muted">{option.help}</p>}
              </div>
            ),
          )}

          {error && (
            <div role="alert" className="rounded-md bg-danger-soft px-3 py-2.5">
              <p className="text-sm font-medium text-danger">{error.message}</p>
              {error.detail && <p className="mt-1 break-words text-xs text-fg-muted">{error.detail}</p>}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" loading={saving} disabled={replacingKey && apiKey.trim().length < 8}>
              {replacingKey ? "Save and test" : "Save"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setMode("idle")} disabled={saving}>
              Cancel
            </Button>
            <a
              href={provider.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto inline-flex items-center gap-0.5 text-sm text-fg-muted hover:text-fg"
            >
              Documentation
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </a>
          </div>
        </form>
      )}

      <Dialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <DialogContent
          title={`Disconnect ${provider.name}?`}
          description="The saved key is permanently deleted from Nebula. Conversations stay; you'll need a key again to use these models."
        >
          <DialogFooter className="pt-5">
            <Button variant="secondary" onClick={() => setConfirmRemove(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={removing} onClick={remove}>
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  )
}

function StatusBadge({ connection }: { connection: ProviderConnection | null }) {
  if (!connection) {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-fg-subtle">
        <CircleDashed className="size-3.5" aria-hidden="true" />
        Not connected
      </span>
    )
  }
  if (connection.status === "valid") {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-medium text-success">
        <CheckCircle2 className="size-3.5" aria-hidden="true" />
        Connected
      </span>
    )
  }
  if (connection.status === "invalid") {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-medium text-danger">
        <XCircle className="size-3.5" aria-hidden="true" />
        Key rejected
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-sm font-medium text-warning">
      <CircleAlert className="size-3.5" aria-hidden="true" />
      Not verified
    </span>
  )
}

function describeOptions(provider: ProviderDefinition, values: Record<string, string>): string | null {
  const parts = (provider.options ?? [])
    .filter((option) => option.type === "select")
    .map((option) => (option.type === "select" ? option.choices.find((c) => c.value === values[option.key])?.label : null))
    .filter(Boolean)
  return parts.length ? parts.join(", ") : null
}
