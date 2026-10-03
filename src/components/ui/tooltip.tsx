"use client"

import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { cn } from "@/lib/cn"
import { Kbd } from "./kbd"

type TooltipProps = {
  label: React.ReactNode
  shortcut?: string[]
  side?: "top" | "right" | "bottom" | "left"
  align?: "start" | "center" | "end"
  children: React.ReactElement
  disabled?: boolean
}

/** Accessible tooltip. The trigger keeps its own aria-label; this is supplementary. */
export function Tooltip({ label, shortcut, side = "top", align = "center", children, disabled }: TooltipProps) {
  if (disabled) return children
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          align={align}
          sideOffset={6}
          className={cn(
            "z-50 flex items-center gap-2 rounded-sm bg-fg px-2 py-1 text-sm font-medium text-fg-inverse",
            "data-[state=delayed-open]:animate-fade-in data-[state=instant-open]:animate-fade-in data-[state=closed]:animate-fade-out",
          )}
        >
          {label}
          {shortcut && (
            <span className="flex gap-0.5">
              {shortcut.map((key) => (
                <Kbd key={key} tone="inverse">
                  {key}
                </Kbd>
              ))}
            </span>
          )}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
