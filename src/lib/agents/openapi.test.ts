import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import { join, relative, sep } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { openApiDocument } from "./openapi"

const API_DIR = fileURLToPath(new URL("../../app/api/", import.meta.url))
const METHODS = ["get", "post", "put", "patch", "delete"] as const

type Operation = {
  operationId?: string
  summary?: string
  description?: string
  security?: unknown[]
  responses?: Record<string, { description?: string; content?: Record<string, { schema?: unknown }> }>
}

const doc = openApiDocument("https://nebula.test")
const paths = doc.paths as Record<string, Record<string, Operation | unknown>>

function operations(): [string, string, Operation][] {
  return Object.entries(paths).flatMap(([path, item]) =>
    METHODS.filter((method) => method in item).map((method) => [path, method, item[method] as Operation] as [string, string, Operation]),
  )
}

/** "/api/providers/{provider}" → methods exported by its route.ts, from the source tree. */
function implementedRoutes(): Map<string, string[]> {
  const routes = new Map<string, string[]>()
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name === "route.ts") {
        const segments = relative(API_DIR, dir).split(sep).filter(Boolean)
        if (segments.some((segment) => segment.startsWith("[["))) continue // the JSON 404 catch-all
        const path = `/api/${segments.map((s) => s.replace(/^\[(.+)\]$/, "{$1}")).join("/")}`
        const source = readFileSync(full, "utf8")
        const methods = [...source.matchAll(/export (?:async )?(?:function|const) (GET|POST|PUT|PATCH|DELETE)\b/g)].map((m) =>
          m[1].toLowerCase(),
        )
        routes.set(path, methods.sort())
      }
    }
  }
  walk(API_DIR)
  return routes
}

test("documents exactly the API routes and methods the app implements", () => {
  const documented = new Map(
    Object.entries(paths).map(([path, item]) => [path, METHODS.filter((method) => method in item).sort() as string[]]),
  )
  assert.deepEqual(Object.fromEntries(documented), Object.fromEntries(implementedRoutes()))
})

test("every operation is self-describing and function-calling friendly", () => {
  const ids = new Set<string>()
  for (const [path, method, op] of operations()) {
    const where = `${method.toUpperCase()} ${path}`
    assert.match(op.operationId ?? "", /^[a-zA-Z][a-zA-Z0-9_]{2,63}$/, `${where}: operationId`)
    assert.ok(!ids.has(op.operationId!), `${where}: duplicate operationId`)
    ids.add(op.operationId!)
    assert.ok(op.summary && op.description && op.description.length >= 40, `${where}: summary and description`)
    assert.ok(Array.isArray(op.security), `${where}: explicit security`)
    const responses = Object.entries(op.responses ?? {})
    assert.ok(responses.some(([status]) => status.startsWith("2")), `${where}: success response`)
    for (const [status, response] of responses) {
      assert.ok(response.description, `${where} ${status}: description`)
      const schemas = Object.values(response.content ?? {}).map((media) => media.schema)
      assert.ok(schemas.length > 0 && schemas.every(Boolean), `${where} ${status}: typed response schema`)
    }
    if (op.security!.length > 0) assert.ok(op.responses?.["401"], `${where}: documents 401`)
  }
})

test("only the catalog is public", () => {
  const publicOps = operations().filter(([, , op]) => op.security?.length === 0).map(([path, method]) => `${method} ${path}`)
  assert.deepEqual(publicOps, ["get /api/catalog"])
})

test("every $ref resolves and every path parameter is declared", () => {
  const text = JSON.stringify(doc)
  const schemas = doc.components.schemas as Record<string, unknown>
  for (const [, name] of text.matchAll(/"\$ref":"#\/components\/schemas\/([^"]+)"/g)) {
    assert.ok(schemas[name], `missing schema ${name}`)
  }
  for (const [path, item] of Object.entries(paths)) {
    const declared = ((item as { parameters?: { name: string; in: string }[] }).parameters ?? []).filter((p) => p.in === "path")
    for (const [, name] of path.matchAll(/\{([^}]+)\}/g)) {
      assert.ok(declared.some((p) => p.name === name), `${path}: path parameter ${name}`)
    }
  }
})

test("is a valid OpenAPI 3.1 document shape", () => {
  assert.equal(doc.openapi, "3.1.0")
  assert.ok(doc.info.title && doc.info.version)
  assert.deepEqual(doc.servers, [{ url: "https://nebula.test" }])
  assert.equal(doc.components.securitySchemes.supabaseSession.in, "cookie")
  assert.match(doc.components.securitySchemes.supabaseSession.name, /^sb-[a-z0-9]+-auth-token$/)
})
