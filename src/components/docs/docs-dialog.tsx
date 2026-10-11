"use client"

import { ArrowUpRight } from "lucide-react"
import { useRef, useState } from "react"
import { Dialog, DialogBody, DialogContent } from "@/components/ui/dialog"
import { DocsContent } from "./docs-content"

/**
 * A link to /docs that opens the docs in a dialog, so people can read them on the
 * sign-in and sign-up pages without leaving (and losing) what they've typed. It's a
 * real link, so crawlers and agents find the docs, and modified clicks (new tab,
 * new window) still open the page. `children` is the link text.
 */
export function DocsDialog({ className, children }: { className?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const linkRef = useRef<HTMLAnchorElement>(null)

  function onClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    setOpen(true)
  }

  return (
    <>
      <a ref={linkRef} href="/docs" className={className} onClick={onClick} aria-haspopup="dialog">
        {children}
      </a>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          size="lg"
          title="Nebula docs"
          // Back to the link on close, as a DialogTrigger would.
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            linkRef.current?.focus()
          }}
          description={
            <a href="/docs" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-accent hover:underline">
              Open in a new tab
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </a>
          }
        >
          <DialogBody className="pb-8">
            <DocsContent variant="dialog" />
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  )
}
