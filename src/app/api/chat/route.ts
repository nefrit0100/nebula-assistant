import { after } from "next/server"
import { z } from "zod"
import { findCatalogEntry } from "@/lib/providers/catalog"
import { toApiError, type ApiErrorPayload } from "@/lib/providers/errors"
import {
  AbortedError,
  getAdapter,
  normalizeProviderError,
  ProviderError,
  type ChatTurn,
  type FinishReason,
  type Usage,
} from "@/lib/providers/server"
import { PROVIDER_IDS, type ProviderId } from "@/lib/providers/types"
import { authenticate, jsonError, parseBody, rateLimit } from "@/lib/server/api"
import { loadProviderContext } from "@/lib/server/credentials"
import { buildSystemPrompt, deriveTitle } from "@/lib/server/prompt"
import { LIMITS } from "@/lib/settings"
import {
  MESSAGE_COLUMNS,
  toChatMessage,
  type Attachment,
  type ChatMessage,
  type ChatStreamEvent,
} from "@/lib/chat/types"
import type { Json } from "@/lib/supabase/database.types"

export const maxDuration = 300

const AttachmentSchema = z.object({
  name: z.string().trim().min(1).max(200),
  type: z.string().max(100),
  size: z.number().int().nonnegative().max(LIMITS.attachmentBytes),
  text: z.string().max(LIMITS.attachmentBytes),
})

const BodySchema = z.object({
  conversationId: z.uuid().nullish(),
  projectId: z.uuid().nullish(),
  provider: z.enum(PROVIDER_IDS),
  model: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[\w.:/@+-]+$/, "Invalid model id")
    .refine((id) => !id.includes(".."), "Invalid model id"),
  action: z.enum(["send", "regenerate", "edit", "continue"]),
  content: z.string().max(LIMITS.message).optional(),
  attachments: z.array(AttachmentSchema).max(LIMITS.attachmentCount).optional(),
  targetMessageId: z.uuid().optional(),
})

const HISTORY_LIMIT = 200
const IDLE_TIMEOUT_MS = 120_000
const CONTINUE_PROMPT = "Continue exactly where you left off. Do not repeat anything you already wrote."

export async function POST(request: Request) {
  const auth = await authenticate()
  if (auth instanceof Response) return auth
  const { viewer, supabase } = auth

  const body = await parseBody(request, BodySchema)
  if (body instanceof Response) return body

  const content = body.content?.trim() ?? ""
  const attachments = body.attachments ?? []
  if ((body.action === "send" || body.action === "edit") && !content && attachments.length === 0) {
    return jsonError("invalid_input", 400, "Message is empty.")
  }
  if (body.action !== "send" && (!body.targetMessageId || !body.conversationId)) {
    return jsonError("invalid_input", 400, "targetMessageId and conversationId are required for this action.")
  }

  if (!(await rateLimit(supabase, "chat", 30, 60))) return jsonError("nebula_rate_limited", 429)

  const provider: ProviderId = body.provider
  let providerContext
  try {
    providerContext = await loadProviderContext(supabase, viewer.id, provider)
  } catch (error) {
    const code = error instanceof ProviderError ? error.code : "unknown"
    return jsonError(code, 400)
  }

  // ── Conversation ──────────────────────────────────────────────────────────
  let conversation: { id: string; title: string; project_id: string | null; provider_id: string | null; model_id: string | null }
  let createdConversation = false

  if (body.conversationId) {
    const { data } = await supabase
      .from("conversations")
      .select("id, title, project_id, provider_id, model_id")
      .eq("id", body.conversationId)
      .maybeSingle()
    if (!data) return jsonError("not_found", 404, "Conversation not found.")
    conversation = data
  } else {
    const { data, error } = await supabase
      .from("conversations")
      .insert({
        title: deriveTitle(content || attachments[0]?.name || ""),
        project_id: body.projectId ?? null,
        provider_id: provider,
        model_id: body.model,
      })
      .select("id, title, project_id, provider_id, model_id")
      .single()
    if (error || !data) {
      return error?.code === "23503"
        ? jsonError("not_found", 404, "Project not found.")
        : jsonError("unknown", 500, "Could not create the conversation.")
    }
    conversation = data
    createdConversation = true
  }

  // ── Apply the action to the stored transcript ─────────────────────────────
  let userMessage: ChatMessage | null = null
  let removedFromSeq: number | null = null
  let continueTarget: ChatMessage | null = null

  if (body.action !== "send") {
    const { data: target } = await supabase
      .from("messages")
      .select(MESSAGE_COLUMNS)
      .eq("id", body.targetMessageId!)
      .eq("conversation_id", conversation.id)
      .maybeSingle()
    if (!target) return jsonError("not_found", 404, "Message not found.")
    const targetMessage = toChatMessage(target)

    if (body.action === "edit") {
      if (targetMessage.role !== "user") return jsonError("invalid_input", 400, "Only your own messages can be edited.")
      removedFromSeq = target.seq
      const { error } = await supabase.from("messages").delete().eq("conversation_id", conversation.id).gte("seq", target.seq)
      if (error) return jsonError("unknown", 500, "Could not update the conversation.")
      userMessage = await insertUserMessage(conversation.id, content, targetMessage.attachments)
      if (!userMessage) return jsonError("unknown", 500, "Could not save your message.")
    } else if (body.action === "regenerate") {
      // Regenerating an assistant reply drops it; regenerating from a user message drops what follows.
      removedFromSeq = targetMessage.role === "assistant" ? target.seq : target.seq + 1
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("conversation_id", conversation.id)
        .gte("seq", removedFromSeq)
      if (error) return jsonError("unknown", 500, "Could not update the conversation.")
    } else {
      if (targetMessage.role !== "assistant") return jsonError("invalid_input", 400, "Only replies can be continued.")
      continueTarget = targetMessage
    }
  } else {
    userMessage = await insertUserMessage(conversation.id, content, attachments)
    if (!userMessage) return jsonError("unknown", 500, "Could not save your message.")
  }

  async function insertUserMessage(conversationId: string, text: string, files: Attachment[]) {
    const { data } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        role: "user",
        content: text,
        attachments: files as unknown as Json,
      })
      .select(MESSAGE_COLUMNS)
      .single()
    return data ? toChatMessage(data) : null
  }

  // ── Context: history, personalization, project ────────────────────────────
  const [historyResult, settingsResult, projectResult] = await Promise.all([
    supabase
      .from("messages")
      .select(MESSAGE_COLUMNS)
      .eq("conversation_id", conversation.id)
      .order("seq", { ascending: false })
      .limit(HISTORY_LIMIT),
    supabase
      .from("user_settings")
      .select("nickname, about_me, response_style, custom_instructions, show_reasoning")
      .eq("user_id", viewer.id)
      .maybeSingle(),
    conversation.project_id
      ? supabase.from("projects").select("name, instructions").eq("id", conversation.project_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const history = (historyResult.data ?? []).map(toChatMessage).reverse()
  if (continueTarget) {
    // Only include the transcript up to the reply being continued.
    const cut = history.findIndex((message) => message.id === continueTarget!.id)
    if (cut >= 0) history.splice(cut + 1)
  }

  const turns = buildTurns(history, body.model)
  if (continueTarget) turns.push({ role: "user", content: CONTINUE_PROMPT })
  if (turns.length === 0 || turns[turns.length - 1].role !== "user") {
    return jsonError("invalid_input", 400, "There is no message to respond to.")
  }

  const settings = settingsResult.data
  const system = buildSystemPrompt({
    nickname: settings?.nickname,
    aboutMe: settings?.about_me,
    responseStyle: settings?.response_style,
    customInstructions: settings?.custom_instructions,
    project: projectResult.data,
  })

  if (!createdConversation && (conversation.provider_id !== provider || conversation.model_id !== body.model)) {
    await supabase.from("conversations").update({ provider_id: provider, model_id: body.model }).eq("id", conversation.id)
  }

  // ── Stream ────────────────────────────────────────────────────────────────
  const assistantMessageId = continueTarget?.id ?? crypto.randomUUID()
  const abort = new AbortController()
  let timedOut = false
  let idleTimer: ReturnType<typeof setTimeout> | undefined
  const resetIdle = () => {
    clearTimeout(idleTimer)
    idleTimer = setTimeout(() => {
      timedOut = true
      abort.abort()
    }, IDLE_TIMEOUT_MS)
  }
  request.signal.addEventListener("abort", () => abort.abort(), { once: true })

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
  const writer = writable.getWriter()
  const encoder = new TextEncoder()
  let clientGone = false
  const send = async (event: ChatStreamEvent) => {
    if (clientGone) return
    try {
      await writer.write(encoder.encode(`${JSON.stringify(event)}\n`))
    } catch {
      clientGone = true
    }
  }

  const generation = (async () => {
    await send({
      type: "start",
      conversationId: conversation.id,
      conversationTitle: conversation.title,
      createdConversation,
      userMessage,
      assistantMessageId,
      removedFromSeq,
    })

    let text = ""
    let reasoning = ""
    let finish: FinishReason | undefined
    let usage: Usage | undefined
    let servedModel: string | undefined
    let failure: ProviderError | null = null
    let aborted = false

    resetIdle()
    try {
      const parts = getAdapter(provider).streamChat(providerContext, {
        model: body.model,
        system,
        messages: turns,
        signal: abort.signal,
        showReasoning: settings?.show_reasoning ?? true,
      })
      for await (const part of parts) {
        resetIdle()
        if (part.type === "text") {
          text += part.delta
          await send({ type: "text", delta: part.delta })
        } else if (part.type === "reasoning") {
          reasoning += part.delta
          await send({ type: "reasoning", delta: part.delta })
        } else {
          finish = part.reason
          usage = part.usage
          servedModel = part.servedModel
        }
      }
    } catch (error) {
      const normalized = normalizeProviderError(error, providerContext.apiKey)
      if (normalized instanceof AbortedError) {
        if (timedOut) failure = new ProviderError("timeout", "No data from the provider for two minutes.")
        else aborted = true
      } else {
        failure = normalized
      }
    } finally {
      clearTimeout(idleTimer)
    }

    if (!failure && finish === "refusal" && !text.trim()) {
      failure = new ProviderError("content_refused")
    }

    const status = failure ? "failed" : aborted ? "cancelled" : "complete"
    const errorPayload: ApiErrorPayload | null = failure ? toApiError(failure.code, failure.detail) : null
    const usageJson = {
      ...(usage ?? {}),
      ...(servedModel && !servedModel.startsWith(body.model) ? { servedModel } : {}),
    }

    const row = {
      content: (continueTarget?.content ?? "") + text,
      reasoning: ((continueTarget?.reasoning ?? "") + reasoning).slice(0, 200_000),
      status,
      provider_id: provider,
      model_id: body.model,
      finish_reason: aborted ? "cancelled" : (finish ?? null),
      usage: usageJson as Json,
      error: errorPayload as Json,
    }

    const persisted = continueTarget
      ? await supabase.from("messages").update(row).eq("id", continueTarget.id).select(MESSAGE_COLUMNS).single()
      : await supabase
          .from("messages")
          .insert({ ...row, id: assistantMessageId, conversation_id: conversation.id, role: "assistant" })
          .select(MESSAGE_COLUMNS)
          .single()

    const message = persisted.data ? toChatMessage(persisted.data) : null
    if (persisted.error) {
      console.error("[chat] failed to persist assistant message", persisted.error.code)
    }

    if (failure) await send({ type: "error", error: errorPayload!, message })
    else if (message) await send({ type: "done", message })
    else await send({ type: "error", error: toApiError("unknown", "The reply could not be saved."), message: null })

    try {
      await writer.close()
    } catch {
      // client already gone
    }
  })()

  // Keep the invocation alive until the reply is persisted, even if the client disconnects.
  after(() => generation)

  return new Response(readable, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store, no-transform",
      "x-accel-buffering": "no",
    },
  })
}

/**
 * Converts stored messages into provider turns: attachments are inlined, empty
 * failed replies are skipped, consecutive same-role turns are merged (some
 * providers require strict alternation), and the oldest turns are dropped to
 * fit the model's context window.
 */
function buildTurns(history: ChatMessage[], model: string): ChatTurn[] {
  const turns: ChatTurn[] = []
  for (const message of history) {
    if (message.role === "assistant" && !message.content.trim()) continue
    let text = message.content
    if (message.role === "user" && message.attachments.length) {
      const files = message.attachments
        .map((file) => `<attachment name="${file.name.replace(/"/g, "'")}">\n${file.text}\n</attachment>`)
        .join("\n\n")
      text = text ? `${text}\n\n${files}` : files
    }
    const previous = turns[turns.length - 1]
    if (previous && previous.role === message.role) previous.content += `\n\n${text}`
    else turns.push({ role: message.role, content: text })
  }
  while (turns.length && turns[0].role !== "user") turns.shift()

  // ~3 characters per token is a conservative estimate across tokenizers.
  const contextTokens = findCatalogEntry(model)?.contextWindow ?? 128_000
  const budget = Math.min(contextTokens, 400_000) * 3 * 0.8
  let total = turns.reduce((sum, turn) => sum + turn.content.length, 0)
  while (total > budget && turns.length > 1) {
    const removed = turns.shift()!
    total -= removed.content.length
    while (turns.length > 1 && turns[0].role !== "user") total -= turns.shift()!.content.length
  }
  return turns
}
