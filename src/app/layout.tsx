import type { Metadata, Viewport } from "next"
import { Instrument_Sans, JetBrains_Mono } from "next/font/google"
import { cookies } from "next/headers"
import { CookieNotice } from "@/components/legal/cookie-notice"
import { Providers } from "@/components/providers"
import { publicEnv } from "@/lib/env"
import { COOKIE_NOTICE_COOKIE } from "@/lib/legal"
import { isTheme, THEME_COOKIE } from "@/lib/settings"
import "./globals.css"

const sans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
})

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
})

const description =
  "A free, open-source AI assistant. Connect your own OpenAI, Anthropic, DeepSeek, Qwen, GLM, OpenRouter or OpenCode keys and chat in one calm workspace."

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.siteUrl),
  title: {
    default: "Nebula Assistant — Your AI workspace",
    template: "%s – Nebula",
  },
  description,
  applicationName: "Nebula Assistant",
  openGraph: {
    type: "website",
    siteName: "Nebula Assistant",
    title: "Nebula Assistant — Your AI workspace",
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: "Nebula Assistant — Your AI workspace",
    description,
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1418" },
  ],
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // The theme lives in a cookie so the server renders the right palette on the
  // first byte — no flash, no blocking script. "system" defers to the OS via CSS.
  const cookieStore = await cookies()
  const stored = cookieStore.get(THEME_COOKIE)?.value
  const theme = isTheme(stored) ? stored : "system"
  const showCookieNotice = !cookieStore.has(COOKIE_NOTICE_COOKIE)

  return (
    <html lang="en" data-theme={theme} className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh">
        <Providers>{children}</Providers>
        {showCookieNotice && <CookieNotice />}
      </body>
    </html>
  )
}
