import assert from "node:assert/strict"
import { test } from "node:test"
import { homeMarkdown, llmsTxt, notFoundMarkdown } from "./content"

const SITE = "https://nebula.test"

test("llms.txt follows the llmstxt.org structure", () => {
  const text = llmsTxt(SITE)
  const lines = text.split("\n")
  assert.equal(lines[0], "# Nebula Assistant", "starts with a single H1 naming the site")
  assert.equal(lines.filter((line) => line.startsWith("# ")).length, 1, "exactly one H1")
  assert.match(lines[2], /^> \S/, "summary blockquote right after the H1")

  // Body text before the first H2 must not contain headings.
  const firstH2 = lines.findIndex((line) => line.startsWith("## "))
  assert.ok(lines.slice(3, firstH2).every((line) => !line.startsWith("#")))

  // Every H2 section is a file list: "- [name](url)" with an optional ": notes".
  const sections = text.split(/^## /m).slice(1)
  assert.ok(sections.length >= 3)
  for (const section of sections) {
    const [, ...body] = section.split("\n")
    const items = body.filter((line) => line.trim())
    assert.ok(items.length > 0)
    for (const item of items) assert.match(item, /^- \[[^\]]+\]\(https?:\/\/[^)\s]+\)(: .+)?$/, item)
  }
})

test("llms.txt tells agents when to use and not use Nebula", () => {
  const text = llmsTxt(SITE)
  assert.match(text, /^## When to use$/m)
  assert.match(text, /^## When not to use$/m)
  assert.match(text, /^## Optional$/m)
  assert.ok(text.includes(`${SITE}/api/catalog`))
  assert.ok(text.includes(`${SITE}/openapi.json`))
})

test("Markdown homepage describes the product and links the agent resources", () => {
  const md = homeMarkdown(SITE)
  assert.match(md, /^# Nebula Assistant\n/)
  for (const path of ["/docs", "/signup", "/llms.txt", "/openapi.json", "/sitemap.xml", "/api/catalog", "/about", "/contact"]) {
    assert.ok(md.includes(`(${SITE}${path})`), path)
  }
})

test("Markdown 404 explains the error and links docs, sitemap and llms.txt", () => {
  const md = notFoundMarkdown("/missing-page", SITE)
  assert.match(md, /^# 404: Page not found\n/)
  assert.ok(md.includes("`/missing-page`"))
  assert.ok(md.length >= 20)
  for (const path of ["/docs", "/sitemap.xml", "/llms.txt"]) assert.ok(md.includes(`(${SITE}${path})`), path)
})

test("Markdown 404 can't be broken out of by the requested path", () => {
  const md = notFoundMarkdown("/a`b\n# injected\u0000", SITE)
  assert.ok(md.includes("`/ab# injected`"))
  assert.ok(!md.includes("\n# injected"))
  assert.equal(notFoundMarkdown(`/${"x".repeat(500)}`, SITE).includes("x".repeat(201)), false)
})
