import type { Metadata } from "next"
import Link from "next/link"
import { LogoMark } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = { title: "Page not found" }

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <LogoMark size={40} />
      <h1 className="mt-6 text-2xl font-semibold tracking-[-0.02em]">This page doesn’t exist.</h1>
      <p className="mt-2 text-md text-fg-muted">Check the address, or head back to your conversations.</p>
      <Button asChild className="mt-6">
        <Link href="/app">Go to Nebula</Link>
      </Button>
    </main>
  )
}
