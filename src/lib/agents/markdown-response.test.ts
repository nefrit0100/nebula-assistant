import assert from "node:assert/strict"
import { test } from "node:test"
import { NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/proxy"
import { markdownForAgents } from "./markdown-response"

const SITE = process.env.NEXT_PUBLIC_SITE_URL!

function request(path: string, accept: string, method = "GET") {
  return new NextRequest(`${SITE}${path}`, { method, headers: { accept, host: new URL(SITE).host } })
}

test("homepage answers Accept: text/markdown with Markdown and Vary: Accept", async () => {
  const response = markdownForAgents(request("/", "text/markdown"))
  assert.ok(response)
  assert.equal(response.status, 200)
  assert.equal(response.headers.get("content-type"), "text/markdown; charset=utf-8")
  assert.equal(response.headers.get("vary"), "Accept")
  assert.match(response.headers.get("cache-control") ?? "", /^(private|no-store)/, "never stored by shared caches")
  assert.match(await response.text(), /^# Nebula Assistant/)
})

test("unknown paths answer Markdown requests with a Markdown 404", async () => {
  const response = markdownForAgents(request("/__probe-404", "text/markdown"))
  assert.ok(response)
  assert.equal(response.status, 404)
  assert.equal(response.headers.get("content-type"), "text/markdown; charset=utf-8")
  assert.equal(response.headers.get("vary"), "Accept")
  assert.match(await response.text(), /^# 404: Page not found/)
})

test("HTML requests, real pages and non-GET requests render as usual", () => {
  assert.equal(markdownForAgents(request("/", "text/html")), null)
  assert.equal(markdownForAgents(request("/__probe-404", "text/html,*/*;q=0.8")), null)
  assert.equal(markdownForAgents(request("/docs", "text/markdown")), null)
  assert.equal(markdownForAgents(request("/app/chat/1", "text/markdown")), null)
  assert.equal(markdownForAgents(request("/__probe-404", "text/markdown", "POST")), null)
})

test("the proxy serves Markdown before touching the session", async () => {
  const markdown = await updateSession(request("/", "text/markdown"))
  assert.equal(markdown.headers.get("content-type"), "text/markdown; charset=utf-8")
  assert.equal(markdown.headers.get("set-cookie"), null)

  const html = await updateSession(request("/", "text/html"))
  assert.equal(html.headers.get("content-type"), null, "HTML requests continue to the page")
})

test("the proxy still sends plain-HTTP requests to HTTPS first", async () => {
  const req = new NextRequest(`${SITE}/`, {
    headers: { accept: "text/markdown", host: new URL(SITE).host, "x-forwarded-proto": "http" },
  })
  const response = await updateSession(req)
  assert.equal(response.status, 308)
})
