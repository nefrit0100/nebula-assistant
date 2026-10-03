"use client"

import { lazy, memo, Suspense, useMemo } from "react"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import { CodeBlock } from "./code-block"

type HastNode = { type: string; value?: string; tagName?: string; properties?: Record<string, unknown>; children?: HastNode[] }

function textOf(node: HastNode | undefined): string {
  if (!node) return ""
  if (node.type === "text") return node.value ?? ""
  return (node.children ?? []).map(textOf).join("")
}

export function makeComponents(streaming: boolean): Components {
  return {
    a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer nofollow" />,
    table: ({ node, ...props }) => (
      <div className="table-wrap">
        <table {...props} />
      </div>
    ),
    pre: ({ node }) => {
      const code = (node as HastNode | undefined)?.children?.find((child) => child.tagName === "code")
      const className = code?.properties?.className
      const classes = Array.isArray(className) ? className.map(String) : []
      const language = classes.find((value) => value.startsWith("language-"))?.slice("language-".length)
      return <CodeBlock code={textOf(code)} language={language} streaming={streaming} />
    },
  }
}

const STATIC_COMPONENTS = makeComponents(false)
const STREAMING_COMPONENTS = makeComponents(true)
const REMARK = [remarkGfm]

/** Math is rare; KaTeX (and its CSS) only load for messages that contain it. */
const MathMarkdown = lazy(() => import("./markdown-math"))

const MATH_PATTERN = /\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|(^|[^\\$\w])\$[^\s$\d][^$\n]*?[^\s\\]\$/

export function hasMath(text: string) {
  return MATH_PATTERN.test(text)
}

/**
 * Splits markdown into top-level blocks at blank lines outside code fences,
 * keeping list items and indented continuations together. Lets streaming
 * re-render only the trailing block.
 */
export function splitBlocks(markdown: string): string[] {
  const blocks: string[] = []
  let current: string[] = []
  let fence: string | null = null

  for (const line of markdown.split("\n")) {
    const fenceMatch = /^\s{0,3}(`{3,}|~{3,})/.exec(line)
    if (fenceMatch) {
      if (!fence) fence = fenceMatch[1]
      else if (fenceMatch[1][0] === fence[0] && fenceMatch[1].length >= fence.length) fence = null
    }
    if (!fence && line.trim() === "" && !fenceMatch) {
      if (current.length) {
        blocks.push(current.join("\n"))
        current = []
      }
      continue
    }
    current.push(line)
  }
  if (current.length) blocks.push(current.join("\n"))

  const merged: string[] = []
  const listItem = /^\s{0,3}([-*+]|\d+[.)])\s/
  for (const block of blocks) {
    const previous = merged[merged.length - 1]
    const continuation = /^\s/.test(block) || (previous !== undefined && listItem.test(previous) && listItem.test(block))
    if (previous !== undefined && continuation) merged[merged.length - 1] = `${previous}\n\n${block}`
    else merged.push(block)
  }
  return merged
}

const Block = memo(function Block({ text, streaming }: { text: string; streaming: boolean }) {
  return (
    <ReactMarkdown remarkPlugins={REMARK} components={streaming ? STREAMING_COMPONENTS : STATIC_COMPONENTS}>
      {text}
    </ReactMarkdown>
  )
})

export const Markdown = memo(function Markdown({ content, streaming = false }: { content: string; streaming?: boolean }) {
  const math = useMemo(() => hasMath(content), [content])
  const blocks = useMemo(() => (streaming ? splitBlocks(content) : null), [content, streaming])

  if (math) {
    return (
      <Suspense fallback={<Block text={content} streaming={false} />}>
        <MathMarkdown content={content} streaming={streaming} />
      </Suspense>
    )
  }

  if (blocks) {
    return (
      <>
        {blocks.map((block, index) => (
          <Block key={index} text={block} streaming={index === blocks.length - 1} />
        ))}
      </>
    )
  }
  return <Block text={content} streaming={false} />
})
