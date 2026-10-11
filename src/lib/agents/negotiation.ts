/**
 * Accept-header negotiation for agents that ask for Markdown
 * (https://acceptmarkdown.com). Browsers send text/html and never text/markdown,
 * so they always keep getting HTML.
 */

type MediaRange = { type: string; q: number }

function parseAccept(header: string): MediaRange[] {
  return header
    .split(",")
    .map((part) => {
      const [type, ...params] = part.trim().split(";")
      const qParam = params.map((param) => param.trim()).find((param) => /^q=/i.test(param))
      const q = qParam ? Number.parseFloat(qParam.slice(2)) : 1
      return { type: type.trim().toLowerCase(), q: Number.isFinite(q) ? Math.min(Math.max(q, 0), 1) : 0 }
    })
    .filter((range) => range.type.length > 0)
}

function quality(ranges: MediaRange[], type: string): number {
  return ranges.find((range) => range.type === type)?.q ?? 0
}

/**
 * True when the client explicitly accepts text/markdown at least as much as
 * text/html. Wildcards don't count: a client has to ask for Markdown by name.
 */
export function prefersMarkdown(accept: string | null | undefined): boolean {
  if (!accept) return false
  const ranges = parseAccept(accept)
  const markdown = quality(ranges, "text/markdown")
  return markdown > 0 && markdown >= quality(ranges, "text/html")
}
