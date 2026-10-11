import { llmsTxt } from "@/lib/agents/content"

/** https://llmstxt.org: a Markdown summary of the site for language models. */
export function GET() {
  return new Response(llmsTxt(), {
    headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "public, max-age=3600" },
  })
}
