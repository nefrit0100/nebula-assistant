/**
 * Long deliverables (whole code files, documents, prompts) arrive as file blocks,
 * which the system prompt asks models to write on their own lines:
 *
 *   <file name="index.html">
 *   …the complete content…
 *   </file>
 *
 * Models that ignore the instruction still get tidy files: long fenced code blocks
 * and bare HTML documents are treated the same way. Everything here is pure, so
 * it runs on every streamed frame without touching the DOM.
 */

export type MessageFile = {
  /** As the model wrote it; may include a folder, e.g. "src/app.tsx". */
  name: string
  /** Language id for highlighting and labels, e.g. "html", "markdown", "text". */
  language: string
  content: string
  /** False while the file is still streaming in. */
  complete: boolean
}

export type MessageSegment = { type: "markdown"; text: string } | { type: "file"; file: MessageFile }

/** Fenced code at least this long becomes a file instead of an inline block. */
export const LONG_CODE_LINES = 60

const OPEN_TAG = /^\s{0,3}<file\s+name\s*=\s*(?:"([^"\n]+)"|'([^'\n]+)'|([^\s>]+))[^>\n]*>\s*$/i
const CLOSE_TAG = /^\s{0,3}<\/file>\s*$/i
const FENCE_OPEN = /^\s{0,3}(`{3,}|~{3,})\s*([^\s`]*)[^`]*$/
const FENCE_CLOSE = /^\s{0,3}(`{3,}|~{3,})\s*$/
const HTML_START = /^\s{0,3}<!doctype html/i
const HTML_END = /<\/html>\s*$/i

const EXTENSIONS: Record<string, string> = {
  html: "html", htm: "html", css: "css", scss: "scss", less: "less",
  js: "javascript", mjs: "javascript", cjs: "javascript", jsx: "jsx", ts: "typescript", tsx: "tsx",
  json: "json", md: "markdown", markdown: "markdown", mdx: "mdx", txt: "text", text: "text",
  py: "python", python: "python", rb: "ruby", go: "go", rs: "rust", java: "java", kt: "kotlin",
  swift: "swift", c: "c", h: "c", cpp: "cpp", cc: "cpp", hpp: "cpp", cs: "csharp", php: "php",
  sh: "bash", bash: "bash", zsh: "bash", shell: "bash", ps1: "powershell", sql: "sql",
  yaml: "yaml", yml: "yaml", toml: "toml", xml: "xml", svg: "xml", vue: "vue", svelte: "svelte",
  csv: "csv", ini: "ini", dockerfile: "docker", graphql: "graphql", lua: "lua", dart: "dart",
  scala: "scala", r: "r", javascript: "javascript", typescript: "typescript",
}

const DEFAULT_NAMES: Record<string, string> = {
  html: "index.html", css: "styles.css", javascript: "script.js", typescript: "index.ts",
  tsx: "component.tsx", jsx: "component.jsx", python: "main.py", markdown: "document.md",
  json: "data.json", bash: "script.sh", sql: "query.sql", yaml: "config.yaml", text: "notes.txt",
}

const MIME_TYPES: Record<string, string> = {
  html: "text/html", css: "text/css", javascript: "text/javascript", json: "application/json",
  markdown: "text/markdown", xml: "application/xml", csv: "text/csv",
}

function normalizeLanguage(info: string | null | undefined): string {
  const lang = (info ?? "").toLowerCase().trim()
  return EXTENSIONS[lang] ?? (lang || "text")
}

export function languageFromName(name: string): string | null {
  const base = (name.split(/[\\/]/).pop() ?? name).toLowerCase()
  const ext = base.includes(".") ? base.slice(base.lastIndexOf(".") + 1) : base
  return Object.hasOwn(EXTENSIONS, ext) ? EXTENSIONS[ext] : null
}

/** A safe name for saving: no folders, reserved characters or control codes. */
export function downloadName(file: MessageFile): string {
  const base = file.name.split(/[\\/]/).pop() ?? ""
  const clean = base.replace(/[<>:"|?*\u0000-\u001f]/g, "-").replace(/^[\s.]+|[\s.]+$/g, "").slice(0, 100)
  return clean || DEFAULT_NAMES[file.language] || "file.txt"
}

export function mimeType(language: string): string {
  return MIME_TYPES[language] ?? "text/plain"
}

function trimBlankLines(lines: string[]): string[] {
  let start = 0
  let end = lines.length
  while (start < end && !lines[start].trim()) start++
  while (end > start && !lines[end - 1].trim()) end--
  return lines.slice(start, end)
}

function makeFile(name: string | null, lines: string[], complete: boolean, fenceInfo: string | null): MessageFile {
  let body = trimBlankLines(lines)
  let info = fenceInfo
  const named = name ? languageFromName(name) : null
  // Models sometimes wrap a file's content in a code fence anyway; unwrap it. A Markdown
  // file may legitimately start with a code block, so only a markdown-tagged fence counts there.
  const opening = name && body.length ? FENCE_OPEN.exec(body[0]) : null
  const wrapper = opening && (named !== "markdown" || ["", "md", "markdown"].includes(opening[2].toLowerCase()))
  if (opening && wrapper) {
    const closing = body.length > 1 ? FENCE_CLOSE.exec(body[body.length - 1]) : null
    if (closing && closing[1][0] === opening[1][0]) {
      info = opening[2]
      body = body.slice(1, -1)
    } else if (!complete) {
      info = opening[2]
      body = body.slice(1)
    }
  }
  const language = named || normalizeLanguage(info)
  const display = name?.trim().slice(0, 160)
  return {
    name: display || DEFAULT_NAMES[language] || `snippet.${language === "text" ? "txt" : language}`,
    language,
    content: body.join("\n"),
    complete,
  }
}

/** Splits a reply into Markdown and files. `streaming` marks a trailing unclosed block as in progress. */
export function parseMessage(text: string, streaming: boolean): MessageSegment[] {
  const segments: MessageSegment[] = []
  const lines = text.split("\n")
  let prose: string[] = []

  const flushProse = () => {
    if (prose.join("").trim()) segments.push({ type: "markdown", text: prose.join("\n") })
    prose = []
  }
  const pushFile = (file: MessageFile) => {
    flushProse()
    segments.push({ type: "file", file })
  }

  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    const open = OPEN_TAG.exec(line)
    if (open) {
      const body: string[] = []
      let closed = false
      for (i++; i < lines.length; i++) {
        if (CLOSE_TAG.test(lines[i])) {
          closed = true
          i++
          break
        }
        body.push(lines[i])
      }
      pushFile(makeFile(open[1] ?? open[2] ?? open[3], body, closed || !streaming, null))
      continue
    }

    const fence = FENCE_OPEN.exec(line)
    if (fence) {
      const marker = fence[1]
      let end = i + 1
      let closed = false
      for (; end < lines.length; end++) {
        const close = FENCE_CLOSE.exec(lines[end])
        if (close && close[1][0] === marker[0] && close[1].length >= marker.length) {
          closed = true
          break
        }
      }
      const body = lines.slice(i + 1, end)
      if (body.length >= LONG_CODE_LINES) pushFile(makeFile(null, body, closed || !streaming, fence[2]))
      else prose.push(...lines.slice(i, closed ? end + 1 : end))
      i = closed ? end + 1 : end
      continue
    }

    // A bare HTML document would be dropped by the Markdown renderer; keep it as a file.
    if (HTML_START.test(line)) {
      let end = i
      while (end < lines.length && !HTML_END.test(lines[end])) end++
      const closed = end < lines.length
      pushFile(makeFile("index.html", lines.slice(i, closed ? end + 1 : end), closed || !streaming, null))
      i = closed ? end + 1 : end
      continue
    }

    prose.push(line)
    i++
  }
  flushProse()
  return segments
}

/** The reply as plain Markdown: file blocks become titled code fences that survive copy and paste. */
export function toPortableMarkdown(text: string): string {
  return parseMessage(text, false)
    .map((segment) => {
      if (segment.type === "markdown") return segment.text.trim()
      const { name, language, content } = segment.file
      const longestRun = Math.max(2, ...(content.match(/`+/g) ?? []).map((run) => run.length))
      const fence = "`".repeat(longestRun + 1)
      return `**${name}**\n\n${fence}${language === "text" ? "" : language}\n${content}\n${fence}`
    })
    .join("\n\n")
}

export function countLines(content: string): number {
  if (!content) return 0
  let count = 1
  for (let index = content.indexOf("\n"); index !== -1; index = content.indexOf("\n", index + 1)) count++
  return count
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Saves text as a file through a temporary object URL. */
export function downloadText(name: string, content: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([content], { type: `${type};charset=utf-8` }))
  const link = document.createElement("a")
  link.href = url
  link.download = name
  link.click()
  // Revoking right away can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
