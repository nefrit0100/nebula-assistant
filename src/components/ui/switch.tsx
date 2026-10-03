"use client"

import { cn } from "@/lib/cn"

type SwitchProps = {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  id?: string
  "aria-labelledby"?: string
  "aria-describedby"?: string
  "aria-label"?: string
}

export function Switch({ checked, onCheckedChange, disabled, ...aria }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors duration-200 ease-soft",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-accent" : "bg-line-strong",
      )}
      {...aria}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-block size-[18px] rounded-full shadow-[0_1px_2px_rgb(0_0_0/0.2)] transition-transform duration-200 ease-soft",
          checked ? "translate-x-[19px] bg-accent-fg" : "translate-x-[3px] bg-white",
        )}
      />
    </button>
  )
}
