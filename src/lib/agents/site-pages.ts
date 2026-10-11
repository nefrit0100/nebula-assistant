import { LEGAL_UPDATED } from "@/lib/legal"

/** When the non-legal public pages last changed (YYYY-MM-DD). Update it with their content. */
export const PAGES_UPDATED = "2026-10-11"

/** "October 8, 2026" → "2026-10-08", the same calendar day in every timezone. */
export function isoDay(display: string): string {
  const date = new Date(display)
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const LEGAL_DAY = isoDay(LEGAL_UPDATED)

/** Every public, indexable page, for the sitemap and robots.txt. */
export const PUBLIC_PAGES: { path: string; /** YYYY-MM-DD */ updated: string; priority: number }[] = [
  { path: "/", updated: PAGES_UPDATED, priority: 1 },
  { path: "/signup", updated: PAGES_UPDATED, priority: 0.8 },
  { path: "/docs", updated: PAGES_UPDATED, priority: 0.8 },
  { path: "/about", updated: PAGES_UPDATED, priority: 0.6 },
  { path: "/contact", updated: PAGES_UPDATED, priority: 0.5 },
  { path: "/privacy", updated: LEGAL_DAY, priority: 0.3 },
  { path: "/terms", updated: LEGAL_DAY, priority: 0.3 },
  { path: "/cookies", updated: LEGAL_DAY, priority: 0.3 },
]

/** Public machine-readable files and endpoints for agents and crawlers. */
export const AGENT_FILES = ["/llms.txt", "/openapi.json", "/api/catalog"]
