import { serializeJsonLd } from "@/lib/agents/structured-data"

/** Structured data for search engines and AI agents (https://json-ld.org). */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />
}
