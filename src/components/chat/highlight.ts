"use client"

const ALIASES: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  py: "python",
  rb: "ruby",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  console: "bash",
  yml: "yaml",
  md: "markdown",
  rs: "rust",
  kt: "kotlin",
  cs: "csharp",
  "c#": "csharp",
  "c++": "cpp",
  ps: "powershell",
  ps1: "powershell",
  golang: "go",
  dockerfile: "docker",
  plaintext: "text",
  txt: "text",
}

const LABELS: Record<string, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  tsx: "TSX",
  jsx: "JSX",
  python: "Python",
  bash: "Shell",
  json: "JSON",
  html: "HTML",
  css: "CSS",
  sql: "SQL",
  yaml: "YAML",
  markdown: "Markdown",
  rust: "Rust",
  go: "Go",
  java: "Java",
  kotlin: "Kotlin",
  swift: "Swift",
  csharp: "C#",
  cpp: "C++",
  c: "C",
  php: "PHP",
  ruby: "Ruby",
  powershell: "PowerShell",
  docker: "Dockerfile",
  graphql: "GraphQL",
  toml: "TOML",
  diff: "Diff",
  text: "Plain text",
}

export function normalizeLanguage(raw: string | undefined): string {
  const lang = (raw ?? "").toLowerCase().trim()
  return ALIASES[lang] ?? (lang || "text")
}

export function languageLabel(lang: string): string {
  return LABELS[lang] ?? (lang === "text" ? "Plain text" : lang.charAt(0).toUpperCase() + lang.slice(1))
}

type Shiki = typeof import("shiki")
let shikiPromise: Promise<Shiki> | null = null
const cache = new Map<string, string>()

/**
 * Highlights with Shiki, loaded on first use. Grammars are fetched per language,
 * and dual themes are emitted as CSS variables so switching light/dark never
 * re-highlights.
 */
export async function highlight(code: string, lang: string): Promise<string | null> {
  const key = `${lang}\0${code}`
  const hit = cache.get(key)
  if (hit) return hit
  shikiPromise ??= import("shiki")
  const shiki = await shikiPromise
  const supported = lang !== "text" && lang in shiki.bundledLanguages
  try {
    const html = await shiki.codeToHtml(code, {
      lang: supported ? lang : "text",
      themes: { light: "vitesse-light", dark: "vitesse-dark" },
      defaultColor: false,
    })
    if (cache.size > 200) cache.delete(cache.keys().next().value!)
    cache.set(key, html)
    return html
  } catch {
    return null
  }
}
