import Link from "next/link"
import { Logo } from "@/components/brand/logo"
import { SkipLink } from "@/components/ui/skip-link"

const FOOTER_LINKS = [
  { href: "/docs", label: "Docs" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/cookies", label: "Cookies" },
]

/** Layout for pages anyone can read without signing in: docs and the legal pages. */
export function PublicPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg">
      <SkipLink />
      <header className="border-b border-line">
        <div className="mx-auto flex h-14 max-w-[44rem] items-center justify-between px-5">
          <Link href="/" className="rounded-sm" aria-label="Nebula home">
            <Logo />
          </Link>
          <Link href="/app" className="rounded-xs text-md text-fg-muted hover:text-fg">
            Open Nebula
          </Link>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-[44rem] px-5 pb-16 pt-12">
        {children}
      </main>
      <footer className="border-t border-line">
        <nav aria-label="Site" className="mx-auto flex max-w-[44rem] flex-wrap gap-x-5 gap-y-2 px-5 py-6 text-sm text-fg-muted">
          {FOOTER_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="rounded-xs hover:text-fg">
              {link.label}
            </Link>
          ))}
        </nav>
      </footer>
    </div>
  )
}
