"use client"

import { ArrowUpRight } from "lucide-react"
import { Dialog, DialogBody, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { DocsContent } from "./docs-content"

/**
 * The docs in a dialog, so people can read them on the sign-in and sign-up pages
 * without leaving (and losing) what they've typed. `children` is the trigger.
 */
export function DocsDialog({ children }: { children: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        size="lg"
        title="Nebula docs"
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
  )
}
