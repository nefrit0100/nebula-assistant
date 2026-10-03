"use client"

import { ArrowUp, FileText, Paperclip, Square, X } from "lucide-react"
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react"
import { toast } from "sonner"
import { IconButton } from "@/components/ui/icon-button"
import { Spinner } from "@/components/ui/spinner"
import { Tooltip } from "@/components/ui/tooltip"
import type { Attachment } from "@/lib/chat/types"
import { cn } from "@/lib/cn"
import { LIMITS } from "@/lib/settings"

const TEXT_EXTENSIONS =
  /\.(txt|md|markdown|csv|tsv|json|jsonl|xml|ya?ml|toml|ini|cfg|conf|env\.example|log|html?|css|scss|less|js|jsx|mjs|cjs|ts|tsx|py|rb|go|rs|java|kt|swift|c|h|cc|cpp|hpp|cs|php|sh|bash|zsh|ps1|sql|graphql|gql|r|lua|dart|scala|vue|svelte|tex|rst|srt|vtt)$/i

const ACCEPT = ".txt,.md,.markdown,.csv,.tsv,.json,.jsonl,.xml,.yaml,.yml,.toml,.ini,.log,.html,.css,.js,.jsx,.ts,.tsx,.py,.rb,.go,.rs,.java,.kt,.swift,.c,.h,.cpp,.cs,.php,.sh,.sql,.graphql,.r,.lua,.dart,.vue,.svelte,.tex,.rst,text/*,application/json"

export type ComposerHandle = {
  setDraft: (content: string, attachments?: Attachment[]) => void
  focus: () => void
  openFilePicker: () => void
}

type ComposerProps = {
  onSend: (content: string, attachments: Attachment[]) => boolean
  onStop: () => void
  status: "idle" | "submitting" | "streaming"
  canSend: boolean
  blockedReason?: string
  sendOnEnter: boolean
  modelSelector: React.ReactNode
  placeholder?: string
  autoFocus?: boolean
  variant?: "hero" | "docked"
}

export const Composer = forwardRef<ComposerHandle, ComposerProps>(function Composer(
  { onSend, onStop, status, canSend, blockedReason, sendOnEnter, modelSelector, placeholder = "Ask anything", autoFocus, variant = "docked" },
  ref,
) {
  const [value, setValue] = useState("")
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [dragging, setDragging] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const busy = status !== "idle"
  const hasInput = value.trim().length > 0 || attachments.length > 0
  const tooLong = value.length > LIMITS.message
  const sendDisabled = !hasInput || busy || !canSend || tooLong

  useImperativeHandle(ref, () => ({
    setDraft(content, files) {
      setValue(content)
      if (files) setAttachments(files)
      requestAnimationFrame(() => {
        const node = textareaRef.current
        if (!node) return
        node.focus()
        node.setSelectionRange(node.value.length, node.value.length)
      })
    },
    focus: () => textareaRef.current?.focus(),
    openFilePicker: () => fileRef.current?.click(),
  }))

  // Grow with content up to a comfortable maximum.
  useEffect(() => {
    const node = textareaRef.current
    if (!node) return
    node.style.height = "auto"
    const max = Math.min(window.innerHeight * 0.4, 320)
    node.style.height = `${Math.min(node.scrollHeight, max)}px`
    node.style.overflowY = node.scrollHeight > max ? "auto" : "hidden"
  }, [value])

  useEffect(() => {
    if (autoFocus && window.matchMedia("(pointer: fine)").matches) textareaRef.current?.focus()
  }, [autoFocus])

  const submit = useCallback(() => {
    if (sendDisabled) return
    const sent = onSend(value.trim(), attachments)
    if (sent) {
      setValue("")
      setAttachments([])
    }
  }, [sendDisabled, onSend, value, attachments])

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const incoming = Array.from(files)
      const room = LIMITS.attachmentCount - attachments.length
      if (incoming.length > room) toast.error(`You can attach up to ${LIMITS.attachmentCount} files per message.`)
      const accepted: Attachment[] = []
      for (const file of incoming.slice(0, Math.max(room, 0))) {
        const textLike = file.type.startsWith("text/") || file.type === "application/json" || TEXT_EXTENSIONS.test(file.name)
        if (!textLike) {
          toast.error(`${file.name} isn't a text file`, { description: "Attach text, code, CSV, JSON or Markdown files." })
          continue
        }
        if (file.size > LIMITS.attachmentBytes) {
          toast.error(`${file.name} is too large`, { description: `Files can be up to ${LIMITS.attachmentBytes / 1000} KB.` })
          continue
        }
        const text = await file.text()
        if (text.includes("\u0000")) {
          toast.error(`${file.name} looks like a binary file`)
          continue
        }
        accepted.push({ name: file.name.slice(0, 200), type: file.type || "text/plain", size: file.size, text })
      }
      if (accepted.length) {
        setAttachments((current) => [...current, ...accepted.filter((a) => !current.some((c) => c.name === a.name))])
        textareaRef.current?.focus()
      }
    },
    [attachments.length],
  )

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return
    const touch = window.matchMedia("(pointer: coarse)").matches
    const wantsSend = (sendOnEnter && !touch) || event.metaKey || event.ctrlKey
    if (!wantsSend) return
    event.preventDefault()
    submit()
  }

  return (
    <div className="relative">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
        onDragOver={(event) => {
          if (event.dataTransfer.types.includes("Files")) {
            event.preventDefault()
            setDragging(true)
          }
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false)
        }}
        onDrop={(event) => {
          if (!event.dataTransfer.files.length) return
          event.preventDefault()
          setDragging(false)
          void addFiles(event.dataTransfer.files)
        }}
        className={cn(
          "relative rounded-2xl border bg-bg transition-[border-color,box-shadow] duration-200 ease-soft",
          "border-line-strong shadow-raise focus-within:border-fg-faint",
          variant === "hero" && "shadow-pop",
          dragging && "border-accent ring-4 ring-accent/10",
        )}
      >
        {attachments.length > 0 && (
          <ul className="flex flex-wrap gap-1.5 px-3 pt-3" aria-label="Attached files">
            {attachments.map((file) => (
              <li key={file.name} className="flex h-9 items-center gap-2 rounded-md border border-line bg-canvas pl-2.5 pr-1 text-sm">
                <FileText className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
                <span className="max-w-[180px] truncate">{file.name}</span>
                <span className="text-xs text-fg-subtle">{Math.max(1, Math.round(file.size / 1000))} KB</span>
                <button
                  type="button"
                  onClick={() => setAttachments((current) => current.filter((c) => c.name !== file.name))}
                  aria-label={`Remove ${file.name}`}
                  className="inline-flex size-6 items-center justify-center rounded-xs text-fg-subtle hover:bg-hover hover:text-fg"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <label htmlFor="composer-input" className="sr-only">
          Message
        </label>
        <textarea
          id="composer-input"
          ref={textareaRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          onPaste={(event) => {
            if (event.clipboardData.files.length) {
              event.preventDefault()
              void addFiles(event.clipboardData.files)
            }
          }}
          placeholder={placeholder}
          rows={1}
          aria-describedby={tooLong ? "composer-error" : undefined}
          className={cn(
            "block w-full resize-none bg-transparent px-4 text-base leading-relaxed text-fg outline-none placeholder:text-fg-subtle",
            variant === "hero" ? "min-h-[60px] pt-4" : "min-h-[52px] pt-3.5",
          )}
        />

        <div className="flex items-center gap-1 px-2 pb-2 pt-1">
          <IconButton size="sm" label="Attach text files" onClick={() => fileRef.current?.click()} disabled={attachments.length >= LIMITS.attachmentCount}>
            <Paperclip />
          </IconButton>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept={ACCEPT}
            className="hidden"
            tabIndex={-1}
            onChange={(event) => {
              if (event.target.files) void addFiles(event.target.files)
              event.target.value = ""
            }}
          />
          {modelSelector}
          <div className="ml-auto flex items-center gap-2">
            {tooLong && (
              <span id="composer-error" className="text-xs text-danger">
                {value.length.toLocaleString()} / {LIMITS.message.toLocaleString()}
              </span>
            )}
            {status === "streaming" ? (
              <Tooltip label="Stop generating">
                <button
                  type="button"
                  onClick={onStop}
                  aria-label="Stop generating"
                  className="inline-flex size-9 items-center justify-center rounded-full bg-fg text-fg-inverse transition-transform active:scale-95"
                >
                  <Square className="size-3.5 fill-current" />
                </button>
              </Tooltip>
            ) : (
              <Tooltip label={blockedReason ?? "Send message"} disabled={!blockedReason && sendDisabled}>
                <button
                  type="submit"
                  aria-label="Send message"
                  aria-disabled={sendDisabled}
                  className={cn(
                    "inline-flex size-9 items-center justify-center rounded-full transition-[background-color,transform] duration-150",
                    sendDisabled ? "cursor-default bg-hover text-fg-faint" : "bg-fg text-fg-inverse active:scale-95",
                  )}
                >
                  {status === "submitting" ? <Spinner className="size-4" /> : <ArrowUp className="size-[18px]" strokeWidth={2.25} />}
                </button>
              </Tooltip>
            )}
          </div>
        </div>
      </form>
      {dragging && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-mist/80 text-md font-medium text-fg">
          Drop text files to attach
        </div>
      )}
    </div>
  )
})
