import Link from "next/link"
import { Logo } from "@/components/brand/logo"

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg">
      <header className="border-b border-line">
        <div className="mx-auto flex h-14 max-w-[44rem] items-center justify-between px-5">
          <Link href="/" className="rounded-sm" aria-label="Nebula home">
            <Logo />
          </Link>
          <Link href="/app" className="text-md text-fg-muted hover:text-fg">
            Open Nebula
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-[44rem] px-5 pb-24 pt-12">
        <h1 className="text-3xl font-semibold tracking-[-0.025em]">{title}</h1>
        <p className="mt-2 text-md text-fg-subtle">Last updated {updated}</p>
        <div className="prose-nebula mt-10 [&_h2]:mt-10">{children}</div>
      </main>
    </div>
  )
}

export function OperatorNote() {
  return (
    <aside className="not-prose my-6 rounded-lg border border-line bg-canvas px-4 py-3 text-md text-fg-muted">
      Nebula Assistant is open-source software that anyone can deploy. This page describes how the software handles
      data. The person or organization operating this deployment should review it and add their own contact details
      and legal terms before offering the service to others. It is not legal advice.
    </aside>
  )
}
