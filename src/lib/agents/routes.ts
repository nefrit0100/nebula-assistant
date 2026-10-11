/**
 * Every URL the app serves outside /api and /_next, including the files in public/.
 * The proxy uses it to answer Markdown-preferring agents with a Markdown 404 for
 * paths that don't exist, without rendering anything. Keep it in sync with src/app
 * and public/: routes.test.ts fails when a page, route handler or file is missing.
 */
export const APP_ROUTES = [
  "/",
  "/about",
  "/app",
  "/app/chat/[id]",
  "/app/projects",
  "/app/projects/[id]",
  "/apple-icon.png",
  "/auth/callback",
  "/auth/confirm",
  "/auth/right-side.webp",
  "/brand/icon-192.png",
  "/brand/icon-512.png",
  "/brand/icon-maskable-512.png",
  "/contact",
  "/cookies",
  "/docs",
  "/favicon.ico",
  "/forgot-password",
  "/icon.png",
  "/llms.txt",
  "/login",
  "/manifest.webmanifest",
  "/openapi.json",
  "/opengraph-image",
  "/preview",
  "/privacy",
  "/reset-password",
  "/robots.txt",
  "/settings",
  "/settings/[section]",
  "/signup",
  "/sitemap.xml",
  "/terms",
] as const

const PATTERNS = APP_ROUTES.map(
  (route) => new RegExp(`^${route.replace(/[.]/g, "\\.").replace(/\[[^\]/]+\]/g, "[^/]+")}$`),
)

/** Whether a request path belongs to a page, route handler or file the app serves. */
export function isAppRoute(pathname: string): boolean {
  if (pathname === "/api" || pathname.startsWith("/api/") || pathname.startsWith("/_next/")) return true
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname
  return PATTERNS.some((pattern) => pattern.test(path))
}
