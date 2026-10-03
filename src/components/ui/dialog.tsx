"use client"

import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cn } from "@/lib/cn"

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

type DialogContentProps = React.ComponentProps<typeof DialogPrimitive.Content> & {
  title: React.ReactNode
  description?: React.ReactNode
  /** Hide the visible title (it stays available to screen readers). */
  hideTitle?: boolean
  size?: "sm" | "md" | "lg"
  showClose?: boolean
}

const SIZES = { sm: "sm:max-w-[400px]", md: "sm:max-w-[520px]", lg: "sm:max-w-[680px]" }

/**
 * Centered modal on desktop, bottom sheet on phones. Focus is trapped and
 * restored by Radix; Escape and the scrim close it.
 */
export function DialogContent({
  title,
  description,
  hideTitle,
  size = "sm",
  showClose = true,
  className,
  children,
  onOpenAutoFocus,
  ...props
}: DialogContentProps) {
  // Dialogs with a text field focus it on open (Radix would otherwise focus the close button).
  const focusFirstField = (event: Event) => {
    onOpenAutoFocus?.(event)
    if (event.defaultPrevented) return
    const field = (event.currentTarget as HTMLElement | null)?.querySelector<HTMLElement>(
      "input:not([type=hidden]):not([disabled]), textarea:not([disabled])",
    )
    if (field) {
      event.preventDefault()
      field.focus()
    }
  }

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-scrim data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-50 flex max-h-[min(88dvh,760px)] w-full flex-col overflow-hidden bg-surface shadow-pop focus:outline-none",
          "inset-x-0 bottom-0 rounded-t-2xl pb-[env(safe-area-inset-bottom)] data-[state=closed]:animate-sheet-out data-[state=open]:animate-sheet-in",
          "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-[14vh] sm:-translate-x-1/2 sm:rounded-xl sm:pb-0",
          "sm:data-[state=closed]:animate-pop-out sm:data-[state=open]:animate-pop-in",
          SIZES[size],
          className,
        )}
        onOpenAutoFocus={focusFirstField}
        {...props}
      >
        <div className={cn("flex items-start gap-4 px-5 pt-5 sm:px-6", hideTitle && "sr-only")}>
          <div className="min-w-0 flex-1">
            <DialogPrimitive.Title className="text-lg font-semibold tracking-[-0.01em] text-fg">{title}</DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="mt-1 text-md text-fg-muted">{description}</DialogPrimitive.Description>
            ) : null}
          </div>
          {showClose && !hideTitle && (
            <DialogPrimitive.Close
              aria-label="Close"
              className="-mr-2 -mt-1 inline-flex size-8 items-center justify-center rounded-sm text-fg-subtle transition-colors hover:bg-hover hover:text-fg"
            >
              <X className="size-4" />
            </DialogPrimitive.Close>
          )}
        </div>
        {!description && <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>}
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export function DialogBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6", className)} {...props} />
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col-reverse gap-2 px-5 pb-5 pt-2 sm:flex-row sm:justify-end sm:px-6", className)}
      {...props}
    />
  )
}
