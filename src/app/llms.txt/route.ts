import { llmsTxt } from "@/lib/agents/content"

/**
 * https://llmstxt.org: a Markdown summary of the site for language models. It stays
 * crawlable, but out of search results, where it would only compete with the pages it summarizes.
 */
export function GET() {
  return new Response(llmsTxt(), {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "public, max-age=3600",
      "x-robots-tag": "noindex",
    },
  })
}
