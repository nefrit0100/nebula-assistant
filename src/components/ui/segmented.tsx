"use client"

import { useRef } from "react"
import { cn } from "@/lib/cn"

type Option<T extends string> = { value: T; label: string; description?: string }

type SegmentedProps<T extends string> = {
  value: T
  options: readonly Option<T>[]
  onChange: (value: T) => void
  label: string
  className?: string
}

/** A radio group styled as a segmented control, with roving arrow-key focus. */
export function Segmented<T extends string>({ value, options, onChange, label, className }: SegmentedProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([])

  function onKeyDown(event: React.KeyboardEvent, index: number) {
    const delta = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0
    if (!delta) return
    event.preventDefault()
    const next = (index + delta + options.length) % options.length
    onChange(options[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex rounded-md bg-hover p-[3px]", className)}>
      {options.map((option, index) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            ref={(node) => {
              refs.current[index] = node
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              "h-[34px] flex-1 rounded-[7px] px-3.5 text-md font-medium transition-[background-color,color,box-shadow] duration-150",
              selected ? "bg-bg text-fg shadow-[0_1px_2px_rgb(19_38_46/0.08),0_0_0_1px_var(--line)]" : "text-fg-muted hover:text-fg",
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
