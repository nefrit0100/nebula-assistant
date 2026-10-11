import { NextResponse, type NextRequest } from "next/server"
import { homeMarkdown, notFoundMarkdown } from "./content"
import { prefersMarkdown } from "./negotiation"
import { isAppRoute } from "./routes"

function markdown(body: string, status: number, cacheControl: string) {
  return new NextResponse(body, {
    status,
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      vary: "Accept",
      "cache-control": cacheControl,
    },
  })
}

/**
 * Markdown for agents that ask for it (`Accept: text/markdown`): the homepage, and
 * a Markdown 404 for paths the app doesn't serve. Returns null for everything else,
 * which then renders as usual. Runs before the session is read, so these responses
 * never set or depend on cookies.
 *
 * The HTML for the same URLs can't carry `Vary: Accept` (Next.js sets Vary itself when
 * rendering a page), so the Markdown is never stored by shared caches: a CDN set to
 * cache everything can't hand it to a browser, or the HTML to an agent.
 */
export function markdownForAgents(request: NextRequest): NextResponse | null {
  if (request.method !== "GET" && request.method !== "HEAD") return null
  if (!prefersMarkdown(request.headers.get("accept"))) return null

  const { pathname } = request.nextUrl
  if (pathname === "/") return markdown(homeMarkdown(), 200, "private, max-age=300")
  if (!isAppRoute(pathname)) return markdown(notFoundMarkdown(pathname), 404, "no-store")
  return null
}
