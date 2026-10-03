"use client"

import { Toaster as Sonner } from "sonner"

export function Toaster() {
  return (
    <Sonner
      position="bottom-center"
      gap={8}
      offset={20}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-full items-start gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-md text-fg shadow-pop sm:w-[360px]",
          title: "font-medium",
          description: "text-sm text-fg-muted",
          actionButton: "ml-auto shrink-0 rounded-sm bg-fg px-2.5 py-1 text-sm font-medium text-fg-inverse",
          cancelButton: "shrink-0 rounded-sm px-2.5 py-1 text-sm text-fg-muted hover:bg-hover",
          icon: "mt-0.5 [&_svg]:size-4",
          error: "[&_[data-icon]]:text-danger",
          success: "[&_[data-icon]]:text-success",
        },
      }}
    />
  )
}
