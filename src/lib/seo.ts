import type { Metadata } from "next"

/** The full product name. Search engines show it as the site name and in every page title. */
export const SITE_NAME = "Nebula Assistant"

export const HOME_TITLE = `${SITE_NAME} — Free, open-source BYOK AI assistant`

export const HOME_DESCRIPTION =
  "A free, open-source AI assistant: bring your own OpenAI, Anthropic, DeepSeek, Qwen, GLM, OpenRouter or OpenCode API keys and chat with their models in one workspace."

export const OG_IMAGE_ALT = `${SITE_NAME} — Your AI workspace. Bring your own models.`

/**
 * The card image from src/app/opengraph-image.tsx. Pages inherit it only while they don't set
 * `openGraph` themselves, so pages that do name it explicitly.
 */
const OG_IMAGE = { url: "/opengraph-image", width: 1200, height: 630, alt: OG_IMAGE_ALT, type: "image/png" }

/** Open Graph fields every page shares. Next.js replaces `openGraph` per segment, so pages spread these back in. */
export const SHARED_OPEN_GRAPH = { type: "website", siteName: SITE_NAME, locale: "en_US" } as const

/**
 * Metadata for a public page: title, description, canonical URL, and Open Graph and
 * Twitter cards that describe this page rather than inheriting the homepage's.
 * `title` goes through the root template ("… – Nebula Assistant") unless `absolute` is set.
 */
export function pageMetadata({
  title,
  description,
  path,
  absolute = false,
}: {
  title: string
  description: string
  path: string
  absolute?: boolean
}): Metadata {
  const fullTitle = absolute ? title : `${title} – ${SITE_NAME}`
  return {
    title: absolute ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: { ...SHARED_OPEN_GRAPH, title: fullTitle, description, url: path, images: [OG_IMAGE] },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [OG_IMAGE] },
  }
}

/** Search-console ownership tags, set per deployment (GOOGLE_SITE_VERIFICATION, BING_SITE_VERIFICATION). */
export function siteVerification(): Metadata["verification"] {
  const google = process.env.GOOGLE_SITE_VERIFICATION?.trim()
  const bing = process.env.BING_SITE_VERIFICATION?.trim()
  if (!google && !bing) return undefined
  return { ...(google ? { google } : {}), ...(bing ? { other: { "msvalidate.01": bing } } : {}) }
}
