"use client"

import type { ChatMessage } from "./types"

/**
 * A reply keeps streaming when the user switches to another chat: the request lives
 * on in the background. The chat screen does not, so every in-flight turn is
 * mirrored here, keyed by conversation. A screen that mounts later (the user came
 * back) picks the turn up mid-stream and follows it to the end.
 *
 * Settled turns linger briefly, so a screen built from a stale cached page still
 * shows the finished reply.
 */
export type LiveRun = {
  conversationId: string
  /** Identifies the turn, so the screen that started it can ignore its own echoes. */
  token: string
  /** The user's message for this turn, when the turn added one. */
  user: ChatMessage | null
  /** The reply so far, or its final form once settled. */
  assistant: ChatMessage
  /** Stored messages this edit or regenerate replaces, from this seq on. */
  removedFromSeq: number | null
  done: boolean
  /** The edit or regenerate failed and the stored transcript was left as it was. */
  restored?: boolean
  stop: () => void
}

const KEEP_SETTLED_MS = 5 * 60_000

const runs = new Map<string, LiveRun>()
const listeners = new Map<string, Set<() => void>>()

function emit(conversationId: string) {
  for (const listener of listeners.get(conversationId) ?? []) listener()
}

export function getLiveRun(conversationId: string | null): LiveRun | null {
  return conversationId ? (runs.get(conversationId) ?? null) : null
}

export function publishLiveRun(run: LiveRun) {
  runs.set(run.conversationId, run)
  emit(run.conversationId)
  if (run.done) {
    setTimeout(() => {
      // A newer turn may have replaced this one in the meantime.
      if (runs.get(run.conversationId)?.token === run.token) runs.delete(run.conversationId)
    }, KEEP_SETTLED_MS)
  }
}

export function subscribeLiveRun(conversationId: string, listener: () => void): () => void {
  let set = listeners.get(conversationId)
  if (!set) listeners.set(conversationId, (set = new Set()))
  set.add(listener)
  return () => {
    set.delete(listener)
    if (set.size === 0) listeners.delete(conversationId)
  }
}

/**
 * Folds a turn into a message list: messages it replaces are dropped, the user's
 * message is added if missing and the reply replaces its own entry (a continued
 * reply keeps its id) or is appended. A settled reply never overwrites a version
 * the server already returned. A restored turn changed nothing.
 */
export function mergeLiveRun(messages: ChatMessage[], run: LiveRun): ChatMessage[] {
  if (run.restored) return messages
  let next = messages
  if (run.removedFromSeq !== null) {
    const from = run.removedFromSeq
    next = next.filter(
      (message) => message.seq === null || message.seq < from || message.id === run.user?.id || message.id === run.assistant.id,
    )
  }
  if (run.user && !next.some((message) => message.id === run.user!.id)) next = [...next, run.user]
  const index = next.findIndex((message) => message.id === run.assistant.id)
  if (index === -1) return [...next, run.assistant]
  if (run.done && next[index].status !== "streaming" && next[index].content.length >= run.assistant.content.length) {
    return next
  }
  return next.map((message, i) => (i === index ? run.assistant : message))
}
