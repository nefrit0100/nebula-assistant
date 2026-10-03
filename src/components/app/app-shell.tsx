"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { useWorkspace } from "@/lib/workspace/context"
import { loadPaletteBody, SearchPalette } from "./search-palette"
import { Sidebar } from "./sidebar"

/** Global keyboard shortcuts (documented in Settings → Help). */
function useGlobalShortcuts() {
  const router = useRouter()
  const { store, actions } = useWorkspace()

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const mod = event.metaKey || event.ctrlKey
      const key = event.key.toLowerCase()

      if (mod && !event.shiftKey && key === "k") {
        event.preventDefault()
        actions.setSearchOpen(!store.get().searchOpen)
      } else if (mod && event.shiftKey && key === "o") {
        event.preventDefault()
        actions.startNewChat()
        router.push("/app")
      } else if (mod && event.shiftKey && key === "s") {
        event.preventDefault()
        actions.setSidebarCollapsed(!store.get().sidebarCollapsed)
      } else if (event.shiftKey && key === "escape") {
        const composer = document.getElementById("composer-input")
        if (composer) {
          event.preventDefault()
          composer.focus()
        }
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [actions, router, store])
}

export function AppShell({ children }: { children: React.ReactNode }) {
  useGlobalShortcuts()

  // The search palette is lazy; fetch it once the app is idle so Ctrl/⌘ K opens instantly.
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((callback: () => void) => window.setTimeout(callback, 2000))
    const handle = idle(() => void loadPaletteBody())
    return () => (window.cancelIdleCallback ?? window.clearTimeout)(handle)
  }, [])

  return (
    <div className="flex h-dvh overflow-hidden bg-bg">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-fg px-3 py-2 text-fg-inverse focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>
      <Sidebar />
      <main id="main" className="relative flex min-w-0 flex-1 flex-col">
        {children}
      </main>
      <SearchPalette />
    </div>
  )
}
