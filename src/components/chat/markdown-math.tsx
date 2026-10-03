"use client"

import "katex/dist/katex.min.css"
import ReactMarkdown from "react-markdown"
import rehypeKatex from "rehype-katex"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import { makeComponents } from "./markdown"

const STATIC_COMPONENTS = makeComponents(false)
const STREAMING_COMPONENTS = makeComponents(true)

/**
 * Normalizes LaTeX delimiters to the $ / $$ forms remark-math understands and
 * escapes currency ("$5") so prices aren't mistaken for math.
 */
function normalizeMath(text: string): string {
  return text
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, body: string) => `\n$$\n${body.trim()}\n$$\n`)
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, body: string) => `$${body.trim()}$`)
    .replace(/(^|[\s(])\$(?=\d)/g, "$1\\$")
}

export default function MarkdownMath({ content, streaming }: { content: string; streaming: boolean }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: "ignore", output: "htmlAndMathml" }]]}
      components={streaming ? STREAMING_COMPONENTS : STATIC_COMPONENTS}
    >
      {normalizeMath(content)}
    </ReactMarkdown>
  )
}
