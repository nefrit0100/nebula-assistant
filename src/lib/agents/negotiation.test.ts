import assert from "node:assert/strict"
import { test } from "node:test"
import { prefersMarkdown } from "./negotiation"

test("agents asking for Markdown get it", () => {
  assert.equal(prefersMarkdown("text/markdown"), true)
  assert.equal(prefersMarkdown("text/markdown, text/html;q=0.9, */*;q=0.8"), true)
  assert.equal(prefersMarkdown("TEXT/MARKDOWN; charset=utf-8"), true)
  assert.equal(prefersMarkdown("text/html, text/markdown"), true)
})

test("browsers and generic clients keep getting HTML", () => {
  assert.equal(prefersMarkdown(null), false)
  assert.equal(prefersMarkdown(""), false)
  assert.equal(prefersMarkdown("*/*"), false)
  assert.equal(prefersMarkdown("text/*"), false)
  assert.equal(
    prefersMarkdown("text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"),
    false,
  )
  assert.equal(prefersMarkdown("text/x-component"), false)
})

test("q-values decide between Markdown and HTML", () => {
  assert.equal(prefersMarkdown("text/markdown;q=0.5, text/html"), false)
  assert.equal(prefersMarkdown("text/markdown;q=0"), false)
  assert.equal(prefersMarkdown("text/markdown;q=0.8, text/html;q=0.7"), true)
  assert.equal(prefersMarkdown("text/markdown;q=abc"), false)
})
