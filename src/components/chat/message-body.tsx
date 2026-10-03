"use client"

import { lazy, memo, Suspense, useMemo } from "react"
import { parseMessage } from "@/lib/chat/files"
import { cn } from "@/lib/cn"
import { FileCard } from "./file-card"

/**
 * The Markdown pipeline (~40 KB gzipped) loads only when a reply is shown, and
 * is preloaded at idle by ChatView so the first reply never waits for it.
 */
export const loadMarkdown = () => import("./markdown")
const Markdown = lazy(() => loadMarkdown().then((module) => ({ default: module.Markdown })))

/**
 * A reply's content: Markdown, with files (and very long code blocks) pulled out
 * into cards. Parsing is a single cheap pass, so it runs on every streamed frame.
 */
export const MessageBody = memo(function MessageBody({ content, streaming }: { content: string; streaming: boolean }) {
  const segments = useMemo(() => parseMessage(content, streaming), [content, streaming])

  return segments.map((segment, index) => {
    if (segment.type === "file") return <FileCard key={index} file={segment.file} />
    const live = streaming && index === segments.length - 1
    return (
      <div key={index} className={cn("prose-nebula my-5 first:mt-0 last:mb-0", live && "is-streaming")}>
        <Suspense fallback={<p className="whitespace-pre-wrap">{segment.text}</p>}>
          <Markdown content={segment.text} streaming={live} />
        </Suspense>
      </div>
    )
  })
})
