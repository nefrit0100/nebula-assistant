import type { Metadata } from "next"
import { DocsContent } from "@/components/docs/docs-content"
import { PublicPage } from "@/components/site/public-page"

export const metadata: Metadata = {
  title: "Docs",
  description: "How to get started with Nebula Assistant: accounts, providers and API keys, features, shortcuts and help.",
  alternates: { canonical: "/docs" },
}

export default function DocsPage() {
  return (
    <PublicPage>
      <h1 className="text-3xl font-semibold tracking-[-0.025em]">Nebula docs</h1>
      <p className="mt-2 text-md text-fg-muted">Everything you need to sign up, connect a provider and get going.</p>
      <div className="mt-10">
        <DocsContent variant="page" />
      </div>
    </PublicPage>
  )
}
