"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { COOKIE_NOTICE_COOKIE } from "@/lib/legal"

const YEAR = 60 * 60 * 24 * 365

/**
 * Nebula only sets strictly necessary and preference cookies, which don't need opt-in
 * consent; this notice says so and links to the full list. Offering "Accept" and
 * "Reject" buttons that change nothing would mislead, so there is one: dismiss.
 */
export function CookieNotice() {
  const [open, setOpen] = useState(true)
  if (!open) return null

  function dismiss() {
    const secure = window.location.protocol === "https:" ? "; secure" : ""
    document.cookie = `${COOKIE_NOTICE_COOKIE}=1; path=/; max-age=${YEAR}; samesite=lax${secure}`
    setOpen(false)
  }

  return (
    <section
      aria-label="Cookie notice"
      className="fixed inset-x-3 bottom-3 z-40 flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 text-sm text-fg-muted shadow-pop sm:left-auto sm:right-4 sm:bottom-4 sm:max-w-sm"
    >
      <p>
        Nebula uses only essential cookies, to keep you signed in and remember your preferences. No tracking or
        advertising cookies.{" "}
        <Link href="/cookies" className="rounded-xs font-medium text-accent underline underline-offset-2">
          Cookie Policy
        </Link>
      </p>
      <Button size="sm" className="self-end" onClick={dismiss}>
        OK
      </Button>
    </section>
  )
}
