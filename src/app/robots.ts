import type { MetadataRoute } from "next"
import { publicEnv } from "@/lib/env"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/", "/docs", "/privacy", "/terms", "/cookies"], disallow: ["/app", "/settings", "/api", "/auth"] }],
    host: publicEnv.siteUrl,
  }
}
