import { openApiDocument } from "@/lib/agents/openapi"

/** OpenAPI 3.1 description of every /api endpoint. */
export function GET() {
  return Response.json(openApiDocument(), {
    headers: { "cache-control": "public, max-age=3600", "access-control-allow-origin": "*" },
  })
}
