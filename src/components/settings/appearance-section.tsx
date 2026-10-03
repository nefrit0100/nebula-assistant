"use client"

import { Check } from "lucide-react"
import { Segmented } from "@/components/ui/segmented"
import { cn } from "@/lib/cn"
import { TEXT_SIZES, THEMES, type ThemePreference } from "@/lib/settings"
import { useActions, useWorkspaceState } from "@/lib/workspace/context"
import { SettingsGroup, SettingsSection } from "./primitives"

/** Fixed palettes for the previews, independent of the active theme. */
const PREVIEW = {
  light: { bg: "#ffffff", canvas: "#f6fbfd", line: "#e3ecef", fg: "#13262e", mist: "#dff7ff", subtle: "#a9b8be" },
  dark: { bg: "#0b1418", canvas: "#0e181d", line: "#1c2c33", fg: "#e6f0f3", mist: "#15303a", subtle: "#4f646c" },
}

function ThemePreview({ mode }: { mode: "light" | "dark" }) {
  const p = PREVIEW[mode]
  return (
    <svg viewBox="0 0 120 72" className="block h-auto w-full" aria-hidden="true">
      <rect width="120" height="72" fill={p.bg} />
      <rect width="30" height="72" fill={p.canvas} />
      <line x1="30" y1="0" x2="30" y2="72" stroke={p.line} />
      <rect x="6" y="8" width="16" height="3" rx="1.5" fill={p.fg} opacity="0.75" />
      <rect x="6" y="17" width="18" height="2.5" rx="1.25" fill={p.subtle} />
      <rect x="6" y="23" width="14" height="2.5" rx="1.25" fill={p.subtle} />
      <rect x="72" y="10" width="38" height="9" rx="4.5" fill={p.mist} />
      <rect x="40" y="26" width="58" height="2.5" rx="1.25" fill={p.fg} opacity="0.55" />
      <rect x="40" y="32" width="66" height="2.5" rx="1.25" fill={p.fg} opacity="0.55" />
      <rect x="40" y="38" width="44" height="2.5" rx="1.25" fill={p.fg} opacity="0.55" />
      <rect x="38" y="54" width="74" height="12" rx="6" fill={p.bg} stroke={p.line} />
    </svg>
  )
}

export function AppearanceSection() {
  const actions = useActions()
  const theme = useWorkspaceState((state) => state.settings.theme)
  const textSize = useWorkspaceState((state) => state.settings.textSize)

  return (
    <SettingsSection title="Appearance" description="Changes apply immediately on this and your other devices.">
      <SettingsGroup title="Theme">
        <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-3">
          {THEMES.map((option) => {
            const selected = theme === option.value
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => !selected && void actions.updateSettings({ theme: option.value as ThemePreference })}
                className="group flex flex-col gap-2 text-left"
              >
                <span
                  className={cn(
                    "relative block overflow-hidden rounded-lg border transition-[border-color,box-shadow]",
                    selected ? "border-accent ring-[3px] ring-accent/15" : "border-line group-hover:border-line-strong",
                  )}
                >
                  {option.value === "system" ? (
                    <span className="grid grid-cols-2">
                      <span className="overflow-hidden">
                        <span className="block w-[200%]">
                          <ThemePreview mode="light" />
                        </span>
                      </span>
                      <span className="overflow-hidden">
                        <span className="-ml-[100%] block w-[200%]">
                          <ThemePreview mode="dark" />
                        </span>
                      </span>
                    </span>
                  ) : (
                    <ThemePreview mode={option.value} />
                  )}
                  {selected && (
                    <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-accent text-accent-fg">
                      <Check className="size-3" strokeWidth={3} aria-hidden="true" />
                    </span>
                  )}
                </span>
                <span className={cn("text-md", selected ? "font-medium text-fg" : "text-fg-muted")}>{option.label}</span>
              </button>
            )
          })}
        </div>
      </SettingsGroup>

      <SettingsGroup title="Chat text size" description="Adjusts the size of messages. Interface text stays the same.">
        <Segmented label="Chat text size" value={textSize} options={TEXT_SIZES} onChange={(value) => void actions.updateSettings({ textSize: value })} />
        <div className="chat-scale mt-4 rounded-lg border border-line px-5 py-4" data-text-size={textSize}>
          <p className="prose-nebula">
            Nebula keeps long answers comfortable to read. This is how replies will look at the size you choose.
          </p>
        </div>
      </SettingsGroup>
    </SettingsSection>
  )
}
