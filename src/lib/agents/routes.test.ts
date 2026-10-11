import assert from "node:assert/strict"
import { readdirSync } from "node:fs"
import { join, relative, sep } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { APP_ROUTES, isAppRoute } from "./routes"

const ROOT = fileURLToPath(new URL("../../../", import.meta.url))
const METADATA_FILES: Record<string, string> = {
  "robots.ts": "/robots.txt",
  "sitemap.ts": "/sitemap.xml",
  "manifest.ts": "/manifest.webmanifest",
  "opengraph-image.tsx": "/opengraph-image",
  "icon.png": "/icon.png",
  "apple-icon.png": "/apple-icon.png",
  "favicon.ico": "/favicon.ico",
}

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
  )
}

/** Every URL src/app and public/ actually serve, outside /api. */
function servedRoutes(): string[] {
  const appDir = join(ROOT, "src", "app")
  const routes = walk(appDir).flatMap((file) => {
    const rel = relative(appDir, file).split(sep)
    const name = rel.pop()!
    const segments = rel.filter((segment) => !/^\(.+\)$/.test(segment))
    if (segments[0] === "api") return []
    if (rel.length === 0 && METADATA_FILES[name]) return [METADATA_FILES[name]]
    if (!/^(page|route)\.tsx?$/.test(name)) return []
    return [`/${segments.join("/")}`]
  })
  const publicDir = join(ROOT, "public")
  const files = walk(publicDir).map((file) => `/${relative(publicDir, file).split(sep).join("/")}`)
  return [...routes, ...files]
}

test("APP_ROUTES lists every page, route handler, metadata file and public file", () => {
  const listed = new Set<string>(APP_ROUTES)
  const missing = servedRoutes().filter((route) => !listed.has(route))
  assert.deepEqual(missing, [], `add these to APP_ROUTES in src/lib/agents/routes.ts`)
})

test("APP_ROUTES lists nothing the app doesn't serve", () => {
  const served = new Set(servedRoutes())
  assert.deepEqual(
    APP_ROUTES.filter((route) => !served.has(route)),
    [],
  )
})

test("isAppRoute matches real paths, dynamic segments and trailing slashes", () => {
  for (const path of ["/", "/docs", "/docs/", "/app/chat/123", "/settings/profile", "/api/anything", "/_next/x.js", "/brand/icon-512.png"]) {
    assert.equal(isAppRoute(path), true, path)
  }
})

test("isAppRoute rejects paths that would 404", () => {
  for (const path of ["/.env", "/__probe-404", "/app/chat", "/app/chat/1/2", "/docsx", "/wp-login.php", "/llms.txt.bak"]) {
    assert.equal(isAppRoute(path), false, path)
  }
})
