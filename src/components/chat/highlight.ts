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

type Shiki = {
  highlighter: import("shiki/core").HighlighterCore
  languages: typeof import("shiki/langs").bundledLanguages
}
let shikiPromise: Promise<Shiki> | null = null
const cache = new Map<string, string>()

/**
 * Shiki's default regex engine is WebAssembly, which the CSP (rightly) doesn't
 * allow in production, so every block would silently stay plain. The JavaScript
 * engine needs no WASM download or compile, and starts faster.
 */
function loadShiki(): Promise<Shiki> {
  shikiPromise ??= Promise.all([import("shiki/core"), import("shiki/engine/javascript"), import("shiki/langs")]).then(
    async ([core, engine, langs]) => ({
      highlighter: await core.createHighlighterCore({
        themes: [import("shiki/themes/vitesse-light.mjs"), import("shiki/themes/vitesse-dark.mjs")],
        langs: [],
        engine: engine.createJavaScriptRegexEngine({ forgiving: true }),
      }),
      languages: langs.bundledLanguages,
    }),
    (error: unknown) => {
      // A failed chunk load shouldn't stick: retry on the next block.
      shikiPromise = null
      throw error
    },
  )
  return shikiPromise
}

/**
 * Highlights with Shiki, loaded on first use. Grammars are fetched per language,
 * and dual themes are emitted as CSS variables so switching light/dark never
 * re-highlights.
 */
export async function highlight(code: string, lang: string): Promise<string | null> {
  const key = `${lang}\0${code}`
  const hit = cache.get(key)
  if (hit) return hit
  try {
    const { highlighter, languages } = await loadShiki()
    const grammar = lang !== "text" && Object.hasOwn(languages, lang) ? languages[lang as keyof typeof languages] : null
    if (grammar && !highlighter.getLoadedLanguages().includes(lang)) await highlighter.loadLanguage(grammar)
    const html = highlighter.codeToHtml(code, {
      lang: grammar ? lang : "text",
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

// Swapping a block for its highlighted markup is one long task (tokenizing, then
// thousands of spans to lay out). Run those one at a time, in idle time, and not
// while the reader is scrolling, so they never land in the middle of a fling.
const SCROLL_QUIET_MS = 150
let lastScroll = 0
if (typeof window !== "undefined") {
  window.addEventListener("scroll", () => (lastScroll = performance.now()), { capture: true, passive: true })
}

function quietMoment(): Promise<void> {
  return new Promise((resolve) => {
    const attempt = () => {
      const wait = lastScroll + SCROLL_QUIET_MS - performance.now()
      if (wait > 0) window.setTimeout(attempt, wait)
      else if (window.requestIdleCallback) window.requestIdleCallback(() => resolve(), { timeout: 500 })
      else window.setTimeout(resolve, 0)
    }
    attempt()
  })
}

let queue: Promise<unknown> = Promise.resolve()

/** Highlights in turn with other blocks; resolves null without working if cancelled before its turn. */
export function highlightWhenIdle(code: string, lang: string, cancelled: () => boolean): Promise<string | null> {
  const job = queue.then(async () => {
    if (cancelled()) return null
    await quietMoment()
    return cancelled() ? null : highlight(code, lang)
  })
  queue = job.catch(() => null)
  return job
}
