import type { ApiErrorPayload } from "@/lib/providers/errors"
import type { Tables } from "@/lib/supabase/database.types"

export type Attachment = {
  name: string
  type: string
  size: number
  text: string
}

export type MessageStatus = "complete" | "cancelled" | "failed" | "streaming"

export type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  reasoning: string
  attachments: Attachment[]
  status: MessageStatus
  provider: string | null
  model: string | null
  finishReason: string | null
  servedModel: string | null
  error: ApiErrorPayload | null
  feedback: -1 | 1 | null
  seq: number | null
  createdAt: string
}

export type ChatAction = "send" | "regenerate" | "edit" | "continue"

export type ChatRequestBody = {
  conversationId?: string | null
  projectId?: string | null
  provider: string
  model: string
  action: ChatAction
  content?: string
  attachments?: Attachment[]
  targetMessageId?: string
}

/** Newline-delimited JSON events streamed by POST /api/chat. */
export type ChatStreamEvent =
  | {
      type: "start"
      conversationId: string
      conversationTitle: string
      createdConversation: boolean
      userMessage: ChatMessage | null
      assistantMessageId: string
      /** Messages removed by an edit or regenerate, so other views can drop them. */
      removedFromSeq: number | null
    }
  | { type: "text"; delta: string }
  | { type: "reasoning"; delta: string }
  | { type: "done"; message: ChatMessage }
  | { type: "error"; error: ApiErrorPayload; message: ChatMessage | null }

export const MESSAGE_COLUMNS =
  "id, role, content, reasoning, attachments, status, provider_id, model_id, finish_reason, usage, error, feedback, seq, created_at" as const

type MessageRow = Pick<
  Tables<"messages">,
  | "id"
  | "role"
  | "content"
  | "reasoning"
  | "attachments"
  | "status"
  | "provider_id"
  | "model_id"
  | "finish_reason"
  | "usage"
  | "error"
  | "feedback"
  | "seq"
  | "created_at"
>

export function toChatMessage(row: MessageRow): ChatMessage {
  const usage = (row.usage ?? {}) as { servedModel?: unknown }
  return {
    id: row.id,
    role: row.role === "assistant" ? "assistant" : "user",
    content: row.content,
    reasoning: row.reasoning,
    attachments: Array.isArray(row.attachments) ? (row.attachments as unknown as Attachment[]) : [],
    status: (["complete", "cancelled", "failed"] as const).includes(row.status as "complete")
      ? (row.status as MessageStatus)
      : "complete",
    provider: row.provider_id,
    model: row.model_id,
    finishReason: row.finish_reason,
    servedModel: typeof usage.servedModel === "string" ? usage.servedModel : null,
    error: (row.error as ApiErrorPayload | null) ?? null,
    feedback: row.feedback === 1 || row.feedback === -1 ? row.feedback : null,
    seq: row.seq,
    createdAt: row.created_at,
  }
}

export const MESSAGE_PAGE_SIZE = 60
