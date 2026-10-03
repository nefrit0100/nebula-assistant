"use client"

import { toApiError, type ApiErrorPayload } from "@/lib/providers/errors"
import type { ChatRequestBody, ChatStreamEvent } from "./types"

export class ChatRequestError extends Error {
  constructor(readonly payload: ApiErrorPayload, readonly status: number) {
    super(payload.code)
  }
}

/**
 * POSTs to /api/chat and yields each NDJSON event as it arrives. Non-2xx
 * responses (validation, auth, missing provider) throw ChatRequestError before
 * any event is produced.
 */
export async function* streamChatRequest(body: ChatRequestBody, signal: AbortSignal): AsyncGenerator<ChatStreamEvent> {
  let response: Response
  try {
    response = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal,
    })
  } catch (error) {
    if (signal.aborted) throw error
    throw new ChatRequestError(toApiError("network_error"), 0)
  }

  if (!response.ok || !response.body) {
    let payload: ApiErrorPayload = toApiError(response.status === 401 ? "unauthenticated" : "unknown", `HTTP ${response.status}`)
    try {
      const json = (await response.json()) as { error?: ApiErrorPayload }
      if (json.error) payload = json.error
    } catch {
      // keep the generic payload
    }
    throw new ChatRequestError(payload, response.status)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let newline = buffer.indexOf("\n")
    while (newline !== -1) {
      const line = buffer.slice(0, newline).trim()
      buffer = buffer.slice(newline + 1)
      if (line) yield JSON.parse(line) as ChatStreamEvent
      newline = buffer.indexOf("\n")
    }
  }
  const rest = buffer.trim()
  if (rest) yield JSON.parse(rest) as ChatStreamEvent
}
