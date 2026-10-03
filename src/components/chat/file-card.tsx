"use client"

import { Check, Copy, Download } from "lucide-react"
import { lazy, memo, Suspense, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { IconButton } from "@/components/ui/icon-button"
import { countLines, downloadName, downloadText, formatBytes, mimeType, type MessageFile } from "@/lib/chat/files"
import { cn } from "@/lib/cn"
import { useCopy } from "@/lib/hooks"
import { FileIcon } from "./file-icon"
import { languageLabel, normalizeLanguage } from "./highlight"

/** The full viewer (highlighting, Markdown and HTML preview) loads when a file is opened. */
const loadViewer = () => import("./file-viewer")
const FileViewer = lazy(loadViewer)

const HEAD_LINES = 8
const TAIL_LINES = 6
const MAX_LINE = 160

function headLines(text: string, count: number): string[] {
  const lines: string[] = []
  let start = 0
  while (lines.length < count && start <= text.length) {
    const end = text.indexOf("\n", start)
    lines.push(text.slice(start, end === -1 ? undefined : end))
    if (end === -1) break
    start = end + 1
  }
  return lines
}

/** The last lines without splitting the whole (possibly huge, still growing) text. */
function tailLines(text: string, count: number): string[] {
  let end = text.length
  const lines: string[] = []
  while (lines.length < count && end > 0) {
    const start = text.lastIndexOf("\n", end - 1)
    lines.unshift(text.slice(start + 1, end))
    end = start
  }
  return lines
}

/**
 * A file the model wrote: shown as a compact card instead of thousands of inline
 * lines. While streaming it shows a live line count and the latest lines, which
 * keeps every frame cheap however long the file gets.
 */
export const FileCard = memo(function FileCard({ file }: { file: MessageFile }) {
  const [viewing, setViewing] = useState(false)
  const { copied, copy } = useCopy()
  const lines = countLines(file.content)
  const size = useMemo(() => (file.complete ? formatBytes(new Blob([file.content]).size) : null), [file.complete, file.content])
  const preview = useMemo(() => {
    const picked = file.complete ? headLines(file.content, HEAD_LINES) : tailLines(file.content, TAIL_LINES)
    return picked.map((line) => (line.length > MAX_LINE ? `${line.slice(0, MAX_LINE)}…` : line)).join("\n")
  }, [file.content, file.complete])

  const open = () => {
    if (file.complete) setViewing(true)
  }

  return (
    <div className="my-5 overflow-hidden rounded-xl border border-line bg-surface first:mt-0 last:mb-0">
      <div className="flex items-center gap-3 py-2.5 pl-3 pr-2">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-mist text-fg">
          <FileIcon language={file.language} className="size-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-md font-medium text-fg" title={file.name}>
            {file.name}
          </p>
          <p className="mt-0.5 truncate text-sm tabular-nums text-fg-subtle">
            {file.complete ? (
              `${languageLabel(normalizeLanguage(file.language))} · ${lines.toLocaleString()} line${lines === 1 ? "" : "s"} · ${size}`
            ) : (
              <span role="status">
                <span className="animate-pulse">Writing</span> · {lines.toLocaleString()} lines
              </span>
            )}
          </p>
        </div>
        {file.complete && (
          <div className="flex shrink-0 items-center gap-0.5">
            <IconButton size="sm" label={copied ? "Copied" : `Copy ${file.name}`} onClick={() => copy(file.content)}>
              {copied ? <Check className="text-success" /> : <Copy />}
            </IconButton>
            <IconButton
              size="sm"
              label={`Download ${file.name}`}
              onClick={() => downloadText(downloadName(file), file.content, mimeType(file.language))}
            >
              <Download />
            </IconButton>
            <Button
              size="sm"
              variant="secondary"
              className="ml-1"
              onClick={open}
              onPointerEnter={() => void loadViewer()}
              onFocus={() => void loadViewer()}
            >
              Open
            </Button>
          </div>
        )}
      </div>

      {preview && (
        // An excerpt for sighted users; the Open button is the accessible way in.
        <div
          aria-hidden="true"
          onClick={open}
          className={cn("flex border-t border-line bg-code", file.complete ? "cursor-pointer" : "flex-col justify-end")}
        >
          <pre
            className={cn(
              "max-h-[10.25rem] w-full overflow-hidden whitespace-pre px-4 py-3 font-mono text-[12.5px] leading-[1.6] text-fg-muted",
              file.complete
                ? "[mask-image:linear-gradient(to_bottom,#000_55%,transparent)]"
                : "[mask-image:linear-gradient(to_top,#000_55%,transparent)]",
            )}
          >
            {preview}
          </pre>
        </div>
      )}

      {viewing && (
        <Suspense fallback={null}>
          <FileViewer file={file} open={viewing} onOpenChange={setViewing} />
        </Suspense>
      )}
    </div>
  )
})
