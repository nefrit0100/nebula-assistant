"use client"

import { ArrowDown } from "lucide-react"
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import type { ChatMessage } from "@/lib/chat/types"
import { cn } from "@/lib/cn"
import { Message, type MessageHandlers } from "./message"

type MessageListProps = MessageHandlers & {
  messages: ChatMessage[]
  busy: boolean
  showReasoning: boolean
  hasEarlier: boolean
  loadingEarlier: boolean
  onLoadEarlier: () => void
  modelNames: Record<string, string>
  textSize: string
  /** Changes whenever the user sends, forcing a scroll to the bottom. */
  sendToken: number
  footer?: React.ReactNode
}

const STICK_THRESHOLD = 96

export function MessageList({
  messages,
  busy,
  showReasoning,
  hasEarlier,
  loadingEarlier,
  onLoadEarlier,
  modelNames,
  textSize,
  sendToken,
  footer,
  ...handlers
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const stickRef = useRef(true)
  const [showJump, setShowJump] = useState(false)
  const prependRef = useRef<{ height: number; top: number } | null>(null)

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const node = scrollRef.current
    if (node) node.scrollTo({ top: node.scrollHeight, behavior })
  }, [])

  // Start at the latest message.
  useLayoutEffect(() => {
    scrollToBottom()
  }, [scrollToBottom])

  // Follow new content while the reader is at the bottom.
  useEffect(() => {
    const content = contentRef.current
    if (!content) return
    const observer = new ResizeObserver(() => {
      const pending = prependRef.current
      const node = scrollRef.current
      if (pending && node) {
        node.scrollTop = node.scrollHeight - pending.height + pending.top
        prependRef.current = null
        return
      }
      if (stickRef.current) scrollToBottom()
    })
    observer.observe(content)
    return () => observer.disconnect()
  }, [scrollToBottom])

  useEffect(() => {
    if (sendToken === 0) return
    // The scroll event that follows hides the "jump to latest" button.
    stickRef.current = true
    scrollToBottom("smooth")
  }, [sendToken, scrollToBottom])

  function onScroll() {
    const node = scrollRef.current
    if (!node) return
    const distance = node.scrollHeight - node.scrollTop - node.clientHeight
    stickRef.current = distance < STICK_THRESHOLD
    setShowJump(distance > STICK_THRESHOLD * 3)
  }

  function loadEarlier() {
    const node = scrollRef.current
    if (node) prependRef.current = { height: node.scrollHeight, top: node.scrollTop }
    onLoadEarlier()
  }

  const lastAssistantId = [...messages].reverse().find((message) => message.role === "assistant")?.id

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="chat-scale h-full overflow-y-auto overscroll-contain [scrollbar-gutter:stable]"
        data-text-size={textSize}
      >
        <div ref={contentRef} className="mx-auto flex w-full max-w-[47rem] flex-col gap-8 px-4 pb-10 pt-6 sm:px-6 sm:pt-8">
          {hasEarlier && (
            <div className="flex justify-center">
              <Button variant="ghost" size="sm" loading={loadingEarlier} onClick={loadEarlier}>
                Show earlier messages
              </Button>
            </div>
          )}
          {messages.map((message) => (
            <Message
              key={message.id}
              message={message}
              isLast={message.id === lastAssistantId}
              busy={busy}
              showReasoning={showReasoning}
              modelName={message.model ? modelNames[`${message.provider}::${message.model}`] : undefined}
              {...handlers}
            />
          ))}
          {footer}
        </div>
      </div>

      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-3 flex justify-center transition-[opacity,transform] duration-200 ease-soft",
          showJump ? "opacity-100" : "translate-y-2 opacity-0",
        )}
      >
        <button
          type="button"
          onClick={() => {
            stickRef.current = true
            scrollToBottom("smooth")
          }}
          tabIndex={showJump ? 0 : -1}
          aria-hidden={!showJump}
          className="pointer-events-auto inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-sm font-medium text-fg-muted shadow-raise hover:text-fg"
        >
          <ArrowDown className="size-4" aria-hidden="true" />
          Jump to latest
        </button>
      </div>
    </div>
  )
}
