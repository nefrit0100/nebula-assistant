"use client"

import * as DialogPrimitive from "@radix-ui/react-dialog"
import { lazy, Suspense } from "react"
import { useActions, useWorkspaceState } from "@/lib/workspace/context"

/** The palette body (cmdk + search) loads on first open; preload it on intent. */
export const loadPaletteBody = () => import("./search-palette-body")
const PaletteBody = lazy(loadPaletteBody)

export function SearchPalette() {
  const open = useWorkspaceState((state) => state.searchOpen)
  const actions = useActions()
  return (
    <DialogPrimitive.Root open={open} onOpenChange={actions.setSearchOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-scrim data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-x-3 top-[10vh] z-50 mx-auto max-w-[620px] overflow-hidden rounded-xl border border-line bg-surface shadow-pop focus:outline-none data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in sm:top-[14vh]"
        >
          <DialogPrimitive.Title className="sr-only">Search conversations</DialogPrimitive.Title>
          {open && (
            <Suspense fallback={<div className="h-14 border-b border-line" aria-hidden="true" />}>
              <PaletteBody onClose={() => actions.setSearchOpen(false)} />
            </Suspense>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
