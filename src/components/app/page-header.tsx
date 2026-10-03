"use client"

import { Menu } from "lucide-react"
import { IconButton } from "@/components/ui/icon-button"
import { useActions } from "@/lib/workspace/context"

/** Header for full-page views inside the app shell (projects). */
export function PageHeader({ children, actions }: { children: React.ReactNode; actions?: React.ReactNode }) {
  const workspace = useActions()
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 px-2 sm:px-3">
      <IconButton label="Open menu" className="md:hidden" showTooltip={false} onClick={() => workspace.setMobileNavOpen(true)}>
        <Menu />
      </IconButton>
      <div className="flex min-w-0 flex-1 items-center gap-2 px-1 text-md">{children}</div>
      {actions}
    </header>
  )
}
