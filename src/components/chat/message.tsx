"use client"

import {
  Check,
  ChevronRight,
  Copy,
  FileDown,
  FileText,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  StepForward,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react"
import { memo, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { IconButton } from "@/components/ui/icon-button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/menu"
import { cn } from "@/lib/cn"
import { downloadText, toPortableMarkdown } from "@/lib/chat/files"
import { isLocalMessage } from "@/lib/chat/use-chat"
import type { ChatMessage } from "@/lib/chat/types"
import { useCopy } from "@/lib/hooks"
import { ErrorNotice } from "./error-notice"
import { MessageBody } from "./message-body"

export { loadMarkdown } from "./message-body"

export type MessageHandlers = {
  onRegenerate: (id: string) => void
  onEdit: (id: string, content: string) => void
  onContinue: (id: string) => void
  onFeedback: (id: string, value: 1 | -1) => void
}

type MessageProps = MessageHandlers & {
  message: ChatMessage
  isLast: boolean
  busy: boolean
  showReasoning: boolean
  modelName?: string
}

export const Message = memo(function Message(props: MessageProps) {
  return props.message.role === "user" ? <UserMessage {...props} /> : <AssistantMessage {...props} />
})

// ── User ────────────────────────────────────────────────────────────────────

function UserMessage({ message, busy, onEdit, onRegenerate }: MessageProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(message.content)
  const [expanded, setExpanded] = useState(false)
  const { copied, copy } = useCopy()
  const local = isLocalMessage(message)
  const long = message.content.split("\n").length > 14 || message.content.length > 1400

  if (editing) {
    return (
      <EditForm
        value={draft}
        onChange={setDraft}
        onCancel={() => {
          setDraft(message.content)
          setEditing(false)
        }}
        onSubmit={() => {
          setEditing(false)
          onEdit(message.id, draft)
        }}
      />
    )
  }

  return (
    <article aria-label="Your message" className="group/msg relative flex animate-message-in flex-col items-end gap-1.5">
      {message.attachments.length > 0 && (
        <ul className="flex max-w-[85%] flex-wrap justify-end gap-1.5" aria-label="Attachments">
          {message.attachments.map((file) => (
            <li key={file.name} className="flex items-center gap-1.5 rounded-md border border-line bg-bg px-2.5 py-1.5 text-sm">
              <FileText className="size-3.5 text-fg-subtle" aria-hidden="true" />
              <span className="max-w-[200px] truncate">{file.name}</span>
            </li>
          ))}
        </ul>
      )}
      {message.content && (
        <div className="relative max-w-[min(85%,36rem)] rounded-[20px] bg-mist px-4 py-2.5 text-fg">
          <p
            className={cn(
              "whitespace-pre-wrap break-words text-[length:var(--chat-font-size)] leading-[var(--chat-line-height)]",
              long && !expanded && "line-clamp-[12]",
            )}
          >
            {message.content}
          </p>
          {long && (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="mt-1 rounded-xs text-sm font-medium text-fg-muted hover:text-fg"
            >
              {expanded ? "Show less" : "Show more"}
            </button>
          )}
        </div>
      )}
      {!local && (
        // With a mouse, actions float in the gap below the bubble instead of reserving space.
        <div className="flex items-center gap-0.5 transition-opacity duration-150 pointer-fine:absolute pointer-fine:right-0 pointer-fine:top-full pointer-fine:mt-0.5 pointer-fine:opacity-0 pointer-fine:group-hover/msg:opacity-100 pointer-fine:focus-within:opacity-100">
          <IconButton size="sm" label="Edit message" disabled={busy} onClick={() => setEditing(true)}>
            <Pencil />
          </IconButton>
          <IconButton size="sm" label={copied ? "Copied" : "Copy message"} onClick={() => copy(message.content)}>
            {copied ? <Check className="text-success" /> : <Copy />}
          </IconButton>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton size="sm" label="More actions" showTooltip={false}>
                <MoreHorizontal />
              </IconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem icon={<RotateCcw />} disabled={busy} onSelect={() => onRegenerate(message.id)}>
                Retry from here
              </DropdownMenuItem>
              <DropdownMenuItem icon={<Pencil />} disabled={busy} onSelect={() => setEditing(true)}>
                Edit message
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </article>
  )
}

function EditForm({
  value,
  onChange,
  onCancel,
  onSubmit,
}: {
  value: string
  onChange: (value: string) => void
  onCancel: () => void
  onSubmit: () => void
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    node.focus()
    node.setSelectionRange(node.value.length, node.value.length)
  }, [])
  useEffect(() => {
    const node = ref.current
    if (!node) return
    node.style.height = "auto"
    node.style.height = `${Math.min(node.scrollHeight, 360)}px`
  }, [value])

  return (
    <form
      className="ml-auto w-full max-w-[min(100%,40rem)] rounded-xl border border-line-strong bg-bg p-2 shadow-raise"
      onSubmit={(event) => {
        event.preventDefault()
        if (value.trim()) onSubmit()
      }}
    >
      <label htmlFor="edit-message" className="sr-only">
        Edit your message
      </label>
      <textarea
        id="edit-message"
        ref={ref}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") onCancel()
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault()
            if (value.trim()) onSubmit()
          }
        }}
        rows={1}
        className="block w-full resize-none bg-transparent px-2 py-1.5 text-base leading-relaxed text-fg outline-none"
      />
      <div className="flex items-center justify-between gap-2 px-1 pt-1">
        <p className="text-xs text-fg-subtle">Messages after this one will be replaced.</p>
        <div className="flex gap-1.5">
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={!value.trim()}>
            Send
          </Button>
        </div>
      </div>
    </form>
  )
}

// ── Assistant ───────────────────────────────────────────────────────────────

function AssistantMessage({ message, isLast, busy, showReasoning, modelName, onRegenerate, onContinue, onFeedback }: MessageProps) {
  const streaming = message.status === "streaming"
  const local = isLocalMessage(message)
  const incomplete = message.status === "cancelled" || message.finishReason === "length"
  const hasContent = message.content.trim().length > 0
  const reasoningShown = showReasoning && message.reasoning.trim().length > 0

  return (
    <article aria-label="Nebula's reply" aria-busy={streaming || undefined} className="group/msg relative animate-message-in">
      {reasoningShown && <Reasoning text={message.reasoning} active={streaming && !hasContent} />}

      {hasContent ? (
        <MessageBody content={message.content} streaming={streaming} />
      ) : streaming && !reasoningShown ? (
        // The reasoning disclosure already says "Thinking…" while it streams.
        <ThinkingIndicator label={message.reasoning ? "Reasoning" : "Thinking"} />
      ) : null}

      {message.status === "cancelled" && (
        <p className="mt-2 text-sm text-fg-subtle">{hasContent ? "Stopped." : "Stopped before replying."}</p>
      )}
      {message.finishReason === "length" && message.status === "complete" && (
        <p className="mt-2 text-sm text-fg-subtle">The reply reached the model’s length limit.</p>
      )}

      {message.status === "failed" && message.error && (
        <ErrorNotice
          className={hasContent ? "mt-4" : undefined}
          error={message.error}
          onRetry={!local && !busy ? () => onRegenerate(message.id) : undefined}
        />
      )}

      {!streaming && !local && message.status !== "failed" && (
        <AssistantActions
          message={message}
          visible={isLast}
          busy={busy}
          incomplete={incomplete}
          modelName={modelName}
          onRegenerate={onRegenerate}
          onContinue={onContinue}
          onFeedback={onFeedback}
        />
      )}
    </article>
  )
}

function AssistantActions({
  message,
  visible,
  busy,
  incomplete,
  modelName,
  onRegenerate,
  onContinue,
  onFeedback,
}: {
  message: ChatMessage
  visible: boolean
  busy: boolean
  incomplete: boolean
  modelName?: string
  onRegenerate: (id: string) => void
  onContinue: (id: string) => void
  onFeedback: (id: string, value: 1 | -1) => void
}) {
  const { copied, copy } = useCopy()
  const usage = message.servedModel ? `Answered by ${message.servedModel}` : null
  // File blocks become titled code fences, so copies and downloads read well anywhere.
  const portable = () => toPortableMarkdown(message.content)

  return (
    <div
      className={cn(
        "mt-2 flex items-center gap-0.5 transition-opacity duration-150",
        // Older replies: with a mouse, actions appear on hover in the gap below instead of reserving space.
        !visible &&
          "pointer-fine:absolute pointer-fine:left-0 pointer-fine:top-full pointer-fine:mt-0.5 pointer-fine:opacity-0 pointer-fine:group-hover/msg:opacity-100 pointer-fine:focus-within:opacity-100",
      )}
    >
      <IconButton size="sm" label={copied ? "Copied" : "Copy reply"} onClick={() => copy(portable())}>
        {copied ? <Check className="text-success" /> : <Copy />}
      </IconButton>
      <IconButton size="sm" label="Regenerate" disabled={busy} onClick={() => onRegenerate(message.id)} className="pointer-coarse:hidden">
        <RotateCcw />
      </IconButton>
      {incomplete && (
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => onContinue(message.id)} className="h-8 px-2 text-fg-muted">
          <StepForward className="size-4" aria-hidden="true" />
          Continue
        </Button>
      )}
      <IconButton
        size="sm"
        label="Good response"
        aria-pressed={message.feedback === 1}
        onClick={() => onFeedback(message.id, 1)}
        className={cn("pointer-coarse:hidden", message.feedback === 1 && "text-accent")}
      >
        <ThumbsUp className={message.feedback === 1 ? "fill-current" : undefined} />
      </IconButton>
      <IconButton
        size="sm"
        label="Bad response"
        aria-pressed={message.feedback === -1}
        onClick={() => onFeedback(message.id, -1)}
        className={cn("pointer-coarse:hidden", message.feedback === -1 && "text-accent")}
      >
        <ThumbsDown className={message.feedback === -1 ? "fill-current" : undefined} />
      </IconButton>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton size="sm" label="More actions" showTooltip={false}>
            <MoreHorizontal />
          </IconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[230px]">
          <DropdownMenuItem icon={<RotateCcw />} disabled={busy} onSelect={() => onRegenerate(message.id)} className="pointer-fine:hidden">
            Regenerate
          </DropdownMenuItem>
          <DropdownMenuItem icon={<ThumbsUp />} onSelect={() => onFeedback(message.id, 1)} className="pointer-fine:hidden">
            {message.feedback === 1 ? "Remove good rating" : "Good response"}
          </DropdownMenuItem>
          <DropdownMenuItem icon={<ThumbsDown />} onSelect={() => onFeedback(message.id, -1)} className="pointer-fine:hidden">
            {message.feedback === -1 ? "Remove bad rating" : "Bad response"}
          </DropdownMenuItem>
          {incomplete && (
            <DropdownMenuItem icon={<StepForward />} disabled={busy} onSelect={() => onContinue(message.id)}>
              Continue generating
            </DropdownMenuItem>
          )}
          <DropdownMenuItem icon={<Copy />} onSelect={() => copy(toPlainText(portable()))}>
            Copy as plain text
          </DropdownMenuItem>
          <DropdownMenuItem
            icon={<FileDown />}
            onSelect={() => downloadText(replyFileName(message.content), portable(), "text/markdown")}
          >
            Download as Markdown
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="leading-snug">
            {usage ?? (modelName ? `Model: ${modelName}` : message.model ? `Model: ${message.model}` : "Model unknown")}
          </DropdownMenuLabel>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function Reasoning({ text, active }: { text: string; active: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <details open={open} onToggle={(event) => setOpen(event.currentTarget.open)} className="group/reasoning mb-3">
      <summary className="inline-flex select-none list-none items-center gap-1.5 rounded-sm py-1 pr-2 text-md text-fg-subtle transition-colors hover:text-fg-muted [&::-webkit-details-marker]:hidden">
        <ChevronRight className="size-4 transition-transform duration-150 group-open/reasoning:rotate-90" aria-hidden="true" />
        <span className={cn(active && "animate-pulse")}>{active ? "Thinking…" : "Thought process"}</span>
      </summary>
      {/* Reasoning can run to 100k+ characters; only render it while someone is reading it. */}
      {open && (
        <div className="ml-2 mt-1 max-h-80 overflow-y-auto border-l-2 border-line pl-4 text-md leading-relaxed whitespace-pre-wrap text-fg-muted">
          {text.trim()}
        </div>
      )}
    </details>
  )
}

/** "Here's a landing page for…" → "heres-a-landing-page-for.md" */
function replyFileName(content: string): string {
  const firstLine =
    toPlainText(toPortableMarkdown(content))
      .split("\n")
      .find((line) => line.trim()) ?? ""
  const slug = firstLine
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/, "")
  return `${slug || "reply"}.md`
}

function ThinkingIndicator({ label }: { label: string }) {
  return (
    <div role="status" className="flex items-center gap-2.5 py-1 text-md text-fg-subtle">
      <svg viewBox="0 0 32 32" className="size-[18px]" aria-hidden="true">
        <circle cx="16" cy="16" r="14" fill="var(--fg)" />
        <circle cx="21.5" cy="10.5" r="8" fill="var(--mist)" />
        <circle cx="21.5" cy="10.5" r="2.4" fill="var(--fg)" className="origin-[21.5px_10.5px] animate-[breathe_1.1s_ease-in-out_infinite]" />
      </svg>
      <span>{label}…</span>
    </div>
  )
}

function toPlainText(markdown: string): string {
  return markdown
    .replace(/```[^\n]*\n([\s\S]*?)```/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/^\s*>\s?/gm, "")
    .trim()
}
