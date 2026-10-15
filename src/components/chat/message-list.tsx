"use client"

import { ArrowDown } from "lucide-react"
import { startTransition, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
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
  /** Resolves false when the page couldn't be loaded. */
  onLoadEarlier: () => Promise<boolean>
  modelNames: Record<string, string>
  textSize: string
  /** Changes whenever the user sends, forcing a scroll to the bottom. */
  sendToken: number
  footer?: React.ReactNode
}

const STICK_THRESHOLD = 96
/** Replies rendered when a conversation opens; older ones render as the reader scrolls up. */
const INITIAL_WINDOW = 12
/** Small steps: each one is laid out mid-scroll, and ten long replies at once dropped frames. */
const WINDOW_STEP = 3
/** Fetch the previous page once this few older messages are left to show. */
const FETCH_AHEAD = 10
/** How far above the viewport older messages are rendered (and fetched) ahead of the reader. */
const LOOKAHEAD_PX = 1200

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
  const sentinelRef = useRef<HTMLDivElement>(null)
  const stickRef = useRef(true)
  const [showJump, setShowJump] = useState(false)

  // Long conversations render only their latest messages at first: parsing every
  // reply's Markdown up front made opening a chat take seconds. `hidden` counts the
  // oldest messages not rendered yet; pages fetched from the server join them.
  const [hidden, setHidden] = useState(() => Math.max(0, messages.length - INITIAL_WINDOW))
  const [firstId, setFirstId] = useState(messages[0]?.id)
  if (messages[0]?.id !== firstId) {
    const shift = messages.findIndex((message) => message.id === firstId)
    setFirstId(messages[0]?.id)
    if (shift > 0) setHidden(hidden + shift)
  }
  const start = Math.min(hidden, Math.max(0, messages.length - INITIAL_WINDOW))
  const visible = start > 0 ? messages.slice(start) : messages

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const node = scrollRef.current
    if (node) node.scrollTo({ top: node.scrollHeight, behavior })
  }, [])

  // Start at the latest message.
  useLayoutEffect(() => {
    scrollToBottom()
  }, [scrollToBottom])

  // Content added above the reader (older messages, the "earlier" button going away)
  // must not move what they're reading. Browsers with scroll anchoring already keep
  // them in place, except at the very top; elsewhere (Safari), keep the oldest
  // rendered message where it was.
  const anchorRef = useRef<{ id: string; top: number } | null>(null)
  const anchorId = visible[0]?.id
  useLayoutEffect(() => {
    const node = scrollRef.current
    const content = contentRef.current
    if (!node || !content) return
    const previous = anchorRef.current
    if (previous && !stickRef.current) {
      const element = content.querySelector<HTMLElement>(`[data-message-id="${previous.id}"]`)
      const shift = element ? element.offsetTop - previous.top : 0
      if (shift && (node.scrollTop === 0 || !CSS.supports("overflow-anchor", "auto"))) node.scrollTop += shift
    }
    const element = anchorId ? content.querySelector<HTMLElement>(`[data-message-id="${anchorId}"]`) : null
    anchorRef.current = element && anchorId ? { id: anchorId, top: element.offsetTop } : null
  })

  // Follow new content while the reader is at the bottom.
  useEffect(() => {
    const content = contentRef.current
    if (!content) return
    const observer = new ResizeObserver(() => {
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

  // Near the top: render the next older messages, and fetch the previous page from the
  // server while the last local ones are still on screen, so it's there when they reach it.
  const autoLoadRef = useRef(true)
  const latest = useRef({ start, hasEarlier, loadingEarlier, onLoadEarlier })
  useLayoutEffect(() => {
    latest.current = { start, hasEarlier, loadingEarlier, onLoadEarlier }
  })
  const pull = useCallback(() => {
    const root = scrollRef.current
    const sentinel = sentinelRef.current
    // Measured now rather than taken from the observer, whose last report predates
    // the messages just added.
    if (!root || !sentinel || sentinel.getBoundingClientRect().top < root.getBoundingClientRect().top - LOOKAHEAD_PX) return
    const { start, hasEarlier, loadingEarlier, onLoadEarlier } = latest.current
    if (start > 0) startTransition(() => setHidden(Math.max(0, start - WINDOW_STEP)))
    if (hasEarlier && !loadingEarlier && start <= FETCH_AHEAD && autoLoadRef.current) {
      // One automatic attempt per approach: after a failure, wait for the reader to
      // leave the top and come back (or use the button).
      autoLoadRef.current = false
      void onLoadEarlier().then((ok) => {
        if (ok) autoLoadRef.current = true
      })
    }
  }, [])

  useEffect(() => {
    const root = scrollRef.current
    const sentinel = sentinelRef.current
    if (!root || !sentinel) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) pull()
        else autoLoadRef.current = true
      },
      { root, rootMargin: `${LOOKAHEAD_PX}px 0px 0px 0px` },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [pull])

  // Still near the top after a step (short messages, a page that just arrived): keep going.
  useEffect(() => {
    pull()
  }, [start, hasEarlier, loadingEarlier, pull])

  function onScroll() {
    const node = scrollRef.current
    if (!node) return
    const distance = node.scrollHeight - node.scrollTop - node.clientHeight
    stickRef.current = distance < STICK_THRESHOLD
    setShowJump(distance > STICK_THRESHOLD * 3)
  }

  function showEarlier() {
    if (start > 0) setHidden(Math.max(0, start - WINDOW_STEP))
    else {
      autoLoadRef.current = true
      void onLoadEarlier()
    }
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
          <div ref={sentinelRef} aria-hidden="true" className="-mb-8 h-0" />
          {(start > 0 || hasEarlier) && (
            <div className="flex justify-center">
              <Button variant="ghost" size="sm" loading={start === 0 && loadingEarlier} onClick={showEarlier}>
                Show earlier messages
              </Button>
            </div>
          )}
          {visible.map((message) => (
            <div key={message.id} data-message-id={message.id}>
              <Message
                message={message}
                isLast={message.id === lastAssistantId}
                busy={busy}
                showReasoning={showReasoning}
                modelName={message.model ? modelNames[`${message.provider}::${message.model}`] : undefined}
                {...handlers}
              />
            </div>
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
