"use client"

import { forwardRef } from "react"
import { cn } from "@/lib/cn"
import { Tooltip } from "./tooltip"

const SIZES = {
  sm: "size-8 rounded-sm [&_svg]:size-4",
  md: "size-9 rounded-md [&_svg]:size-[18px]",
  lg: "size-11 rounded-lg [&_svg]:size-5",
} as const

export type IconButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> & {
  /** Required: icon-only buttons must have an accessible name. */
  label: string
  shortcut?: string[]
  size?: keyof typeof SIZES
  tooltipSide?: "top" | "right" | "bottom" | "left"
  showTooltip?: boolean
  active?: boolean
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, shortcut, size = "md", tooltipSide, showTooltip = true, active, className, children, ...props },
  ref,
) {
  const button = (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center text-fg-muted transition-colors duration-150 ease-soft",
        "hover:bg-hover hover:text-fg active:bg-press disabled:pointer-events-none disabled:opacity-40",
        active && "bg-hover text-fg",
        SIZES[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
  return (
    <Tooltip label={label} shortcut={shortcut} side={tooltipSide} disabled={!showTooltip}>
      {button}
    </Tooltip>
  )
})
