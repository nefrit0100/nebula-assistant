"use client"

import { ArrowLeft, ChevronRight, LogOut } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSignOut } from "@/components/app/user-menu"
import { Logo } from "@/components/brand/logo"
import { SkipLink } from "@/components/ui/skip-link"
import { cn } from "@/lib/cn"
import { SETTINGS_SECTIONS } from "./settings-nav"

export function SettingsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isIndex = pathname === "/settings"
  const active = isIndex ? "profile" : pathname.split("/")[2]
  const current = SETTINGS_SECTIONS.find((section) => section.slug === active)
  const { signOut, pending } = useSignOut()

  return (
    <div className="min-h-dvh bg-bg">
      <SkipLink />
      <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-[64rem] items-center gap-3 px-4 sm:px-6">
          {/* Mobile: subpages go back to the section list. */}
          {!isIndex && (
            <Link
              href="/settings"
              className="-ml-2 inline-flex size-9 items-center justify-center rounded-md text-fg-muted hover:bg-hover hover:text-fg lg:hidden"
              aria-label="Back to settings"
            >
              <ArrowLeft className="size-[18px]" />
            </Link>
          )}
          <Link href="/app" className={cn("rounded-sm", !isIndex && "hidden lg:inline-flex")} aria-label="Back to Nebula">
            <Logo />
          </Link>
          <span className={cn("text-md font-medium lg:hidden", isIndex && "hidden")}>{current?.label}</span>
          <Link
            href="/app"
            className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-md text-fg-muted transition-colors hover:bg-hover hover:text-fg"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to chat
          </Link>
        </div>
      </header>

      <div className="mx-auto flex max-w-[64rem] gap-12 px-4 pb-20 pt-6 sm:px-6 lg:pt-12">
        <nav
          aria-label="Settings"
          className={cn("w-full shrink-0 lg:sticky lg:top-26 lg:block lg:w-[220px] lg:self-start", !isIndex && "hidden")}
        >
          <h1 className="mb-5 text-2xl font-semibold tracking-[-0.02em] lg:mb-4 lg:px-3 lg:text-xl">Settings</h1>
          <ul className="flex flex-col gap-px">
            {SETTINGS_SECTIONS.map((section) => {
              const selected = section.slug === active
              return (
                <li key={section.slug}>
                  <Link
                    href={`/settings/${section.slug}`}
                    aria-current={selected && !isIndex ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-3 text-md transition-colors lg:h-9 lg:py-0 [&>svg]:size-[18px] [&>svg]:shrink-0",
                      selected ? "lg:bg-mist lg:font-medium lg:text-fg" : "text-fg lg:text-fg-muted lg:hover:bg-hover lg:hover:text-fg",
                      "hover:bg-hover",
                    )}
                  >
                    <section.icon className="text-fg-muted" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block">{section.label}</span>
                      <span className="block text-sm text-fg-subtle lg:hidden">{section.description}</span>
                    </span>
                    <ChevronRight className="size-4 text-fg-faint lg:hidden" aria-hidden="true" />
                  </Link>
                </li>
              )
            })}
            <li className="mt-2 border-t border-line pt-2">
              <button
                type="button"
                onClick={() => void signOut()}
                disabled={pending}
                className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-md text-fg transition-colors hover:bg-hover lg:h-9 lg:py-0 lg:text-fg-muted lg:hover:text-fg"
              >
                <LogOut className="size-[18px] text-fg-muted" aria-hidden="true" />
                {pending ? "Logging out…" : "Log out"}
              </button>
            </li>
          </ul>
        </nav>

        <main id="main" className={cn("min-w-0 max-w-[42rem] flex-1", isIndex && "hidden lg:block")}>
          {children}
        </main>
      </div>
    </div>
  )
}
