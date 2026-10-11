import { jsonError } from "@/lib/server/api"

/**
 * Any /api path without a route of its own: a JSON 404 instead of the HTML error
 * page, so API clients and agents always get a parseable error.
 */
function notFound(request: Request) {
  const { pathname } = new URL(request.url)
  return jsonError(
    "not_found",
    404,
    `No API endpoint at ${request.method} ${pathname.slice(0, 200)}. The available endpoints are listed in /openapi.json.`,
  )
}

export const GET = notFound
export const POST = notFound
export const PUT = notFound
export const PATCH = notFound
export const DELETE = notFound
