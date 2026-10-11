const SAME_ORIGIN_BASE = "http://nebula.invalid"

/**
 * Only allow same-site relative redirects after auth (prevents open redirects).
 * The value is resolved the way a browser would, so tricks like "/\t/evil.com"
 * (tabs and newlines are stripped, leaving "//evil.com") or "/\evil.com" can't
 * leave the site. The normalized path is returned, never the raw input.
 */
export function safeNextPath(value: string | null | undefined, fallback = "/app"): string {
  if (!value || !value.startsWith("/")) return fallback
  try {
    const url = new URL(value, SAME_ORIGIN_BASE)
    if (url.origin !== SAME_ORIGIN_BASE) return fallback
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return fallback
  }
}
