import type { MetadataRoute } from "next"
import { AGENT_FILES, PUBLIC_PAGES } from "@/lib/agents/site-pages"
import { publicEnv } from "@/lib/env"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [...PUBLIC_PAGES.map((page) => page.path), ...AGENT_FILES],
        disallow: ["/app", "/settings", "/api", "/auth"],
      },
    ],
    sitemap: `${publicEnv.siteUrl}/sitemap.xml`,
    host: publicEnv.siteUrl,
  }
}
