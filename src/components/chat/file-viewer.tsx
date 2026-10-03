"use client"

import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Check, Copy, Download, X } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { IconButton } from "@/components/ui/icon-button"
import { Segmented } from "@/components/ui/segmented"
import { countLines, downloadName, downloadText, formatBytes, mimeType, type MessageFile } from "@/lib/chat/files"
import { useCopy } from "@/lib/hooks"
import { FileIcon } from "./file-icon"
import { highlight, languageLabel, normalizeLanguage } from "./highlight"
import { Markdown } from "./markdown"

type View = "preview" | "code"

const VIEWS = [
  { value: "preview", label: "Preview" },
  { value: "code", label: "Code" },
] as const

/** Highlighting runs on the main thread; past this size the plain view is kinder. */
const HIGHLIGHT_MAX_LINES = 6000
const HIGHLIGHT_MAX_CHARS = 400_000

/** Full-screen view of a file from a reply: code with line numbers, plus a preview for HTML and Markdown. */
export default function FileViewer({
  file,
  open,
  onOpenChange,
}: {
  file: MessageFile
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const previewable = file.language === "html" || file.language === "markdown"
  const [view, setView] = useState<View>(previewable ? "preview" : "code")
  const { copied, copy } = useCopy()
  const lines = countLines(file.content)
  const size = useMemo(() => formatBytes(new Blob([file.content]).size), [file.content])
  const shown: View = previewable ? view : "code"

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-scrim data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-surface outline-none data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in sm:inset-6 sm:mx-auto sm:max-w-[1200px] sm:rounded-xl sm:border sm:border-line sm:shadow-pop"
        >
          <header className="flex shrink-0 items-center gap-3 border-b border-line py-2.5 pl-3 pr-2 sm:pl-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-mist text-fg">
              <FileIcon language={file.language} className="size-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="truncate text-md font-semibold text-fg">{file.name}</DialogPrimitive.Title>
              <p className="truncate text-sm tabular-nums text-fg-subtle">
                {languageLabel(normalizeLanguage(file.language))} · {lines.toLocaleString()} line{lines === 1 ? "" : "s"} · {size}
              </p>
            </div>
            {previewable && (
              <Segmented value={view} options={VIEWS} onChange={setView} label="View" className="mr-1 hidden sm:inline-flex" />
            )}
            <IconButton label={copied ? "Copied" : "Copy file"} onClick={() => copy(file.content)}>
              {copied ? <Check className="text-success" /> : <Copy />}
            </IconButton>
            <IconButton
              label="Download file"
              onClick={() => downloadText(downloadName(file), file.content, mimeType(file.language))}
            >
              <Download />
            </IconButton>
            <DialogPrimitive.Close asChild>
              <IconButton label="Close">
                <X />
              </IconButton>
            </DialogPrimitive.Close>
          </header>

          {previewable && (
            <div className="shrink-0 border-b border-line px-3 py-2 sm:hidden">
              <Segmented value={view} options={VIEWS} onChange={setView} label="View" className="w-full" />
            </div>
          )}

          <div className="relative min-h-0 flex-1 overflow-auto bg-bg">
            {shown === "code" ? (
              <CodeView file={file} lines={lines} />
            ) : file.language === "html" ? (
              <HtmlPreview html={file.content} />
            ) : (
              <div className="chat-scale mx-auto w-full max-w-[47rem] px-5 py-6 sm:px-8 sm:py-10">
                <div className="prose-nebula">
                  <Markdown content={file.content} />
                </div>
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function CodeView({ file, lines }: { file: MessageFile; lines: number }) {
  const lang = normalizeLanguage(file.language)
  const tooLarge = lines > HIGHLIGHT_MAX_LINES || file.content.length > HIGHLIGHT_MAX_CHARS
  // Keyed by content so a stale result never shows for another file.
  const [highlighted, setHighlighted] = useState<{ key: string; html: string } | null>(null)
  const plain = useMemo(() => file.content.split("\n"), [file.content])

  useEffect(() => {
    if (tooLarge) return
    let cancelled = false
    void highlight(file.content, lang).then((html) => {
      if (!cancelled && html) setHighlighted({ key: file.content, html })
    })
    return () => {
      cancelled = true
    }
  }, [file.content, lang, tooLarge])

  const html = highlighted?.key === file.content ? highlighted.html : null
  return (
    <div
      className="code-body min-h-full bg-code"
      data-numbered="true"
      style={{ "--gutter": `${String(lines).length + 0.2}ch` } as React.CSSProperties}
    >
      {html ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <pre>
          <code>
            {plain.map((line, index) => (
              <span key={index} className="line">
                {line}
                {"\n"}
              </span>
            ))}
          </code>
        </pre>
      )}
    </div>
  )
}

/**
 * Renders the page in /preview, framed WITHOUT allow-same-origin: the page gets an
 * opaque origin, so its scripts can't reach Nebula's cookies, storage or DOM.
 */
function HtmlPreview({ html }: { html: string }) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  // Some embedded browsers refuse to load sandboxed frames from a URL. Then the page is
  // rendered inline instead: still sandboxed, but under Nebula's own strict CSP.
  const [inline, setInline] = useState(false)

  useEffect(() => {
    if (inline) return
    let ready = false
    function onMessage(event: MessageEvent) {
      const frame = frameRef.current
      if (!frame || event.source !== frame.contentWindow) return
      if ((event.data as { type?: unknown } | null)?.type !== "nebula-preview-ready") return
      ready = true
      // The framed page has an opaque origin, which can only be addressed as "*".
      frame.contentWindow?.postMessage({ type: "nebula-preview-render", html }, "*")
    }
    window.addEventListener("message", onMessage)
    const fallback = window.setTimeout(() => {
      if (!ready) setInline(true)
    }, 3000)
    return () => {
      window.removeEventListener("message", onMessage)
      clearTimeout(fallback)
    }
  }, [html, inline])

  return (
    <>
      <iframe
        key={inline ? "inline" : "page"}
        ref={frameRef}
        {...(inline ? { srcDoc: html } : { src: "/preview" })}
        title="Page preview"
        sandbox="allow-scripts allow-forms allow-modals allow-popups"
        referrerPolicy="no-referrer"
        className="absolute inset-0 size-full border-0 bg-white"
      />
      {inline && (
        <p className="pointer-events-none absolute bottom-3 left-1/2 max-w-[calc(100%-24px)] -translate-x-1/2 rounded-full bg-fg/85 px-3 py-1.5 text-center text-xs text-fg-inverse">
          Limited preview: scripts, styles and fonts from other sites may not load.
        </p>
      )}
    </>
  )
}
