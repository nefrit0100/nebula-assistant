"use client"

import * as DialogPrimitive from "@radix-ui/react-dialog"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { ChevronDown, KeyRound } from "lucide-react"
import Link from "next/link"
import { lazy, Suspense, useEffect, useState } from "react"
import { cn } from "@/lib/cn"
import { useMediaQuery } from "@/lib/hooks"
import type { ModelInfo, ModelRef, ProviderId } from "@/lib/providers/types"
import { useActions } from "@/lib/workspace/context"

/** The menu body (cmdk, model details) loads on demand; hovering or focusing the trigger preloads it. */
const loadBody = () => import("./model-selector-body")
const SelectorBody = lazy(loadBody)

type ModelSelectorProps = {
  selected: ModelRef | null
  selectedInfo: ModelInfo | null
  connected: ProviderId[]
  onSelect: (ref: ModelRef) => void
  disabled?: boolean
}

export function ModelSelector({ selected, selectedInfo, connected, onSelect, disabled }: ModelSelectorProps) {
  const [open, setOpen] = useState(false)
  const desktop = useMediaQuery("(min-width: 640px)", true)
  const actions = useActions()

  useEffect(() => {
    if (open) void actions.loadModels()
  }, [open, actions])

  if (connected.length === 0) {
    return (
      <Link
        href="/settings/providers"
        className="inline-flex h-8 items-center gap-1.5 rounded-sm px-2.5 text-sm font-medium text-accent transition-colors hover:bg-hover"
      >
        <KeyRound className="size-4" aria-hidden="true" />
        Connect a provider
      </Link>
    )
  }

  const label = selectedInfo?.name ?? selected?.model ?? "Choose a model"
  const trigger = (
    <button
      type="button"
      disabled={disabled}
      aria-label={`Model: ${label}. Change model`}
      onPointerEnter={() => void loadBody()}
      onFocus={() => void loadBody()}
      className={cn(
        "inline-flex h-8 max-w-[min(56vw,240px)] items-center gap-1 rounded-sm px-2.5 text-sm font-medium text-fg-muted transition-colors",
        "hover:bg-hover hover:text-fg disabled:opacity-50 data-[state=open]:bg-hover data-[state=open]:text-fg",
      )}
    >
      <span className="truncate">{label}</span>
      <ChevronDown className="size-3.5 shrink-0 opacity-70" aria-hidden="true" />
    </button>
  )

  const body = (
    <Suspense fallback={<div className={desktop ? "h-[440px]" : "h-[50dvh]"} aria-hidden="true" />}>
      <SelectorBody
        selected={selected}
        connected={connected}
        twoPane={desktop}
        onSelect={(ref) => {
          onSelect(ref)
          setOpen(false)
        }}
      />
    </Suspense>
  )

  if (desktop) {
    return (
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            side="top"
            align="start"
            sideOffset={8}
            collisionPadding={12}
            className="z-50 w-[min(640px,calc(100vw-24px))] overflow-hidden rounded-xl border border-line bg-surface shadow-pop outline-none data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in"
          >
            {body}
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    )
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-scrim data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[82dvh] flex-col overflow-hidden rounded-t-2xl bg-surface pb-[env(safe-area-inset-bottom)] shadow-pop outline-none data-[state=closed]:animate-sheet-out data-[state=open]:animate-sheet-in"
        >
          <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-line-strong" aria-hidden="true" />
          <DialogPrimitive.Title className="px-4 pb-1 pt-3 text-md font-semibold">Choose a model</DialogPrimitive.Title>
          {body}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
