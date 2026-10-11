import assert from "node:assert/strict"
import { test } from "node:test"
import { safeNextPath } from "./urls"

const SITE = "https://nebula.test"

test("keeps same-site paths, including query and hash", () => {
  assert.equal(safeNextPath("/settings"), "/settings")
  assert.equal(safeNextPath("/app/chat/123?x=1#h"), "/app/chat/123?x=1#h")
})

test("falls back for empty or non-path values", () => {
  assert.equal(safeNextPath(null), "/app")
  assert.equal(safeNextPath(""), "/app")
  assert.equal(safeNextPath("https://evil.com"), "/app")
  assert.equal(safeNextPath("settings", "/x"), "/x")
})

test("never resolves to another origin", () => {
  for (const value of ["//evil.com", "/\\evil.com", "/\t/evil.com", "/\n/evil.com", "/\r/evil.com", "/\\\\evil.com"]) {
    const next = safeNextPath(value)
    assert.equal(new URL(next, SITE).origin, SITE, `${JSON.stringify(value)} escaped to ${next}`)
  }
})
