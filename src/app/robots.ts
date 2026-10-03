import type { MetadataRoute } from "next"
import { publicEnv } from "@/lib/env"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/", "/privacy", "/terms"], disallow: ["/app", "/settings", "/api", "/auth"] }],
    host: publicEnv.siteUrl,
  }
}
