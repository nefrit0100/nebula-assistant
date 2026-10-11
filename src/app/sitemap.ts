import type { MetadataRoute } from "next"
import { PUBLIC_PAGES } from "@/lib/agents/site-pages"
import { publicEnv } from "@/lib/env"

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PAGES.map((page) => ({
    url: `${publicEnv.siteUrl}${page.path === "/" ? "" : page.path}`,
    lastModified: new Date(page.updated),
    priority: page.priority,
  }))
}
