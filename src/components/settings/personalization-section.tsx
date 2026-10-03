"use client"

import { Check } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Field, Input, Textarea } from "@/components/ui/field"
import { cn } from "@/lib/cn"
import { LIMITS, RESPONSE_STYLES } from "@/lib/settings"
import { useActions, useWorkspaceState } from "@/lib/workspace/context"
import { SettingsGroup, SettingsSection } from "./primitives"

export function PersonalizationSection() {
  const actions = useActions()
  const settings = useWorkspaceState((state) => state.settings)
  const [draft, setDraft] = useState({
    nickname: settings.nickname,
    aboutMe: settings.aboutMe,
    customInstructions: settings.customInstructions,
  })
  const [saving, setSaving] = useState(false)

  const dirty =
    draft.nickname !== settings.nickname ||
    draft.aboutMe !== settings.aboutMe ||
    draft.customInstructions !== settings.customInstructions

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    const ok = await actions.updateSettings({
      nickname: draft.nickname.trim(),
      aboutMe: draft.aboutMe.trim(),
      customInstructions: draft.customInstructions.trim(),
    })
    setSaving(false)
    if (ok) toast.success("Personalization saved", { description: "Applies to your next message." })
  }

  return (
    <SettingsSection
      title="Personalization"
      description="Help Nebula tailor its answers. This is sent with your messages to the provider you choose."
    >
      <SettingsGroup title="Response style" description="Applies to every conversation. Saved immediately.">
        <div role="radiogroup" aria-label="Response style" className="grid gap-2 sm:grid-cols-3">
          {RESPONSE_STYLES.map((style) => {
            const selected = settings.responseStyle === style.value
            return (
              <button
                key={style.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => !selected && void actions.updateSettings({ responseStyle: style.value })}
                className={cn(
                  "relative flex flex-col items-start rounded-lg border px-4 py-3 text-left transition-colors",
                  selected ? "border-accent bg-mist/60" : "border-line hover:border-line-strong hover:bg-hover",
                )}
              >
                <span className="flex w-full items-center justify-between font-medium text-fg">
                  {style.label}
                  {selected && <Check className="size-4 text-accent" aria-hidden="true" />}
                </span>
                <span className="mt-0.5 text-sm text-fg-muted">{style.description}</span>
              </button>
            )
          })}
        </div>
      </SettingsGroup>

      <form onSubmit={save} className="flex flex-col gap-6">
        <Field label="What should Nebula call you?">
          {(props) => (
            <Input
              {...props}
              value={draft.nickname}
              maxLength={LIMITS.nickname}
              placeholder="e.g. Sam"
              onChange={(event) => setDraft((d) => ({ ...d, nickname: event.target.value }))}
            />
          )}
        </Field>
        <Field
          label="What should Nebula know about you?"
          description="Your work, interests, or anything that helps it give relevant answers."
          counter={{ value: draft.aboutMe.length, max: LIMITS.aboutMe }}
        >
          {(props) => (
            <Textarea
              {...props}
              rows={4}
              maxLength={LIMITS.aboutMe}
              placeholder="e.g. I'm a nurse studying for a pharmacology exam. I prefer examples over theory."
              value={draft.aboutMe}
              onChange={(event) => setDraft((d) => ({ ...d, aboutMe: event.target.value }))}
            />
          )}
        </Field>
        <Field
          label="Custom instructions"
          description="Anything else Nebula should always do, like a format, a language or a tone."
          counter={{ value: draft.customInstructions.length, max: LIMITS.customInstructions }}
        >
          {(props) => (
            <Textarea
              {...props}
              rows={4}
              maxLength={LIMITS.customInstructions}
              placeholder="e.g. Answer in British English. Use metric units."
              value={draft.customInstructions}
              onChange={(event) => setDraft((d) => ({ ...d, customInstructions: event.target.value }))}
            />
          )}
        </Field>
        <div className="flex items-center gap-3">
          <Button type="submit" loading={saving} disabled={!dirty}>
            Save changes
          </Button>
          {dirty && <span className="text-sm text-fg-subtle">Unsaved changes</span>}
        </div>
      </form>
    </SettingsSection>
  )
}
