import assert from "node:assert/strict"
import { test } from "node:test"
import { LEGAL_UPDATED } from "@/lib/legal"
import { PROVIDER_IDS } from "@/lib/providers/types"
import * as apiNotFound from "./api/[[...path]]/route"
import * as catalog from "./api/catalog/route"
import * as llms from "./llms.txt/route"
import * as openapi from "./openapi.json/route"
import robots from "./robots"
import sitemap from "./sitemap"

const SITE = process.env.NEXT_PUBLIC_SITE_URL!

test("unknown /api paths answer every method with a structured JSON 404", async () => {
  for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE"] as const) {
    const response = apiNotFound[method](new Request(`${SITE}/api/v1/nope`, { method }))
    assert.equal(response.status, 404)
    assert.match(response.headers.get("content-type") ?? "", /^application\/json/)
    const body = (await response.json()) as { error: Record<string, unknown> }
    assert.equal(body.error.code, "not_found")
    assert.equal(typeof body.error.message, "string")
    assert.equal(typeof body.error.hint, "string")
    assert.match(String(body.error.detail), new RegExp(`${method} /api/v1/nope.*/openapi\\.json`))
  }
})

test("GET /api/catalog is public JSON listing every provider", async () => {
  const response = catalog.GET()
  assert.equal(response.status, 200)
  assert.equal(response.headers.get("access-control-allow-origin"), "*")
  const body = (await response.json()) as { verifiedOn: string; providers: { id: string; keyUrl: string; models: object[] }[] }
  assert.match(body.verifiedOn, /^\d{4}-\d{2}-\d{2}$/)
  assert.deepEqual(body.providers.map((p) => p.id), [...PROVIDER_IDS])
  for (const provider of body.providers) {
    assert.match(provider.keyUrl, /^https:\/\//)
    for (const model of provider.models) assert.ok(!("source" in model) && !("provider" in model))
  }
})

test("GET /openapi.json serves the spec as JSON", async () => {
  const response = openapi.GET()
  assert.match(response.headers.get("content-type") ?? "", /^application\/json/)
  const body = (await response.json()) as { openapi: string; paths: Record<string, unknown> }
  assert.equal(body.openapi, "3.1.0")
  assert.ok(body.paths["/api/catalog"])
})

test("GET /llms.txt serves Markdown", async () => {
  const response = llms.GET()
  assert.equal(response.headers.get("content-type"), "text/markdown; charset=utf-8")
  assert.match(await response.text(), /^# Nebula Assistant\n\n> /)
})

test("sitemap lists every public page with an absolute URL and lastmod", () => {
  const entries = sitemap()
  const urls = entries.map((entry) => entry.url)
  for (const path of ["", "/docs", "/about", "/contact", "/privacy", "/terms", "/cookies", "/signup"]) {
    assert.ok(urls.includes(`${SITE}${path}`), path)
  }
  for (const entry of entries) {
    assert.ok(entry.lastModified instanceof Date && !Number.isNaN(entry.lastModified.getTime()), entry.url)
  }
  assert.ok(!urls.some((url) => /\/(app|settings|api|auth)(\/|$)/.test(url.slice(SITE.length))))
})

test("sitemap lastmod is the pages' calendar day in any server timezone", () => {
  // LEGAL_UPDATED reads like "October 8, 2026"; lastmod must be that day at UTC midnight.
  const [month, day, year] = LEGAL_UPDATED.replace(",", "").split(" ")
  const monthIndex = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].indexOf(month)
  const expected = new Date(Date.UTC(Number(year), monthIndex, Number(day))).toISOString()
  const privacy = sitemap().find((entry) => entry.url === `${SITE}/privacy`)
  assert.equal((privacy?.lastModified as Date).toISOString(), expected)
})

test("robots.txt points at the sitemap and allows the agent files", () => {
  const rules = robots()
  assert.equal(rules.sitemap, `${SITE}/sitemap.xml`)
  const [rule] = Array.isArray(rules.rules) ? rules.rules : [rules.rules]
  for (const path of ["/llms.txt", "/openapi.json", "/api/catalog", "/about", "/contact"]) {
    assert.ok((rule.allow as string[]).includes(path), path)
  }
  assert.deepEqual(rule.disallow, ["/app", "/settings", "/api", "/auth"])
})
