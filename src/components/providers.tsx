"use client"

import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { Toaster } from "@/components/ui/toaster"

/** App-wide client providers. Kept minimal: tooltips and toasts. */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={400} skipDelayDuration={200}>
      {children}
      <Toaster />
    </TooltipPrimitive.Provider>
  )
}
