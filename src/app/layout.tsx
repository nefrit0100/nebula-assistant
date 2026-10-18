import type { Metadata, Viewport } from "next"
import { Instrument_Sans, JetBrains_Mono } from "next/font/google"
import { cookies } from "next/headers"
import { CookieNotice } from "@/components/legal/cookie-notice"
import { Providers } from "@/components/providers"
import { publicEnv } from "@/lib/env"
import { COOKIE_NOTICE_COOKIE } from "@/lib/legal"
import { HOME_DESCRIPTION, HOME_TITLE, SHARED_OPEN_GRAPH, SITE_NAME, siteVerification } from "@/lib/seo"
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
  // Only code blocks and shortcuts use it; don't let it compete with the first paint of every page.
  preload: false,
})

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.siteUrl),
  title: {
    default: HOME_TITLE,
    template: `%s – ${SITE_NAME}`,
  },
  description: HOME_DESCRIPTION,
  applicationName: SITE_NAME,
  category: "technology",
  openGraph: { ...SHARED_OPEN_GRAPH, title: HOME_TITLE, description: HOME_DESCRIPTION },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
  },
  verification: siteVerification(),
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
