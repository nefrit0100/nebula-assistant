import { publicCatalog } from "@/lib/agents/catalog"

const PUBLIC_HEADERS = {
  "cache-control": "public, max-age=3600",
  // Static, non-personal data: any site or agent may read it.
  "access-control-allow-origin": "*",
}

/** Public, read-only list of supported providers and curated models. No authentication. */
export function GET() {
  return Response.json(publicCatalog(), { headers: PUBLIC_HEADERS })
}
