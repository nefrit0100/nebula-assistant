"use client"

import { useCallback, useEffect, useLayoutEffect, useReducer, useRef } from "react"
import { toast } from "sonner"
import { toApiError, type ApiErrorPayload } from "@/lib/providers/errors"
import type { ModelRef } from "@/lib/providers/types"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { useActions } from "@/lib/workspace/context"
import { ChatRequestError, streamChatRequest } from "./stream-client"
import {
  MESSAGE_COLUMNS,
  MESSAGE_PAGE_SIZE,
  toChatMessage,
  type Attachment,
  type ChatMessage,
  type ChatRequestBody,
} from "./types"

type Status = "idle" | "submitting" | "streaming"

export type ChatState = {
  conversationId: string | null
  messages: ChatMessage[]
  status: Status
  hasEarlier: boolean
  loadingEarlier: boolean
  /** A request-level failure (nothing was sent), shown above the composer. */
  requestError: ApiErrorPayload | null
}

type Action =
  | { type: "begin"; messages: ChatMessage[] }
  | {
      type: "started"
      conversationId: string
      userMessage: ChatMessage | null
      tempUserId: string | null
      placeholderId: string
      assistantId: string
    }
  | { type: "append"; id: string; text: string; reasoning: string }
  | { type: "replace"; id: string; message: ChatMessage }
  | { type: "fail"; id: string; error: ApiErrorPayload }
  | { type: "settle"; id: string; cancelled: boolean }
  | { type: "rollback"; messages: ChatMessage[]; error: ApiErrorPayload }
  | { type: "prepend"; messages: ChatMessage[]; hasEarlier: boolean }
  | { type: "patch"; id: string; patch: Partial<ChatMessage> }
  | { type: "loadingEarlier"; value: boolean }
  | { type: "clearError" }
  | { type: "reset"; messages: ChatMessage[]; hasEarlier: boolean }

function reducer(state: ChatState, action: Action): ChatState {
  switch (action.type) {
    case "begin":
      return { ...state, messages: action.messages, status: "submitting", requestError: null }
    case "started":
      return {
        ...state,
        status: "streaming",
        conversationId: action.conversationId,
        messages: state.messages.map((message) => {
          if (action.tempUserId && message.id === action.tempUserId && action.userMessage) return action.userMessage
          if (message.id === action.placeholderId) return { ...message, id: action.assistantId }
          return message
        }),
      }
    case "append":
      return {
        ...state,
        messages: state.messages.map((message) =>
          message.id === action.id
            ? { ...message, content: message.content + action.text, reasoning: message.reasoning + action.reasoning }
            : message,
        ),
      }
    case "replace":
      return {
        ...state,
        status: "idle",
        messages: state.messages.map((message) => (message.id === action.id ? action.message : message)),
      }
    case "fail":
      return {
        ...state,
        status: "idle",
        messages: state.messages.map((message) =>
          message.id === action.id ? { ...message, status: "failed", error: action.error } : message,
        ),
      }
    case "settle":
      return {
        ...state,
        status: "idle",
        messages: state.messages.map((message) =>
          message.id === action.id && message.status === "streaming"
            ? action.cancelled
              ? { ...message, status: "cancelled", finishReason: "cancelled" }
              : { ...message, status: "failed", error: toApiError("network_error") }
            : message,
        ),
      }
    case "rollback":
      return { ...state, status: "idle", messages: action.messages, requestError: action.error }
    case "prepend":
      return { ...state, messages: [...action.messages, ...state.messages], hasEarlier: action.hasEarlier, loadingEarlier: false }
    case "patch":
      return {
        ...state,
        messages: state.messages.map((message) => (message.id === action.id ? { ...message, ...action.patch } : message)),
      }
    case "loadingEarlier":
      return { ...state, loadingEarlier: action.value }
    case "clearError":
      return { ...state, requestError: null }
    case "reset":
      return { ...state, messages: action.messages, hasEarlier: action.hasEarlier }
  }
}

function localMessage(role: "user" | "assistant", content: string, attachments: Attachment[], model?: ModelRef): ChatMessage {
  return {
    id: `local-${crypto.randomUUID()}`,
    role,
    content,
    reasoning: "",
    attachments,
    status: role === "assistant" ? "streaming" : "complete",
    provider: model?.provider ?? null,
    model: model?.model ?? null,
    finishReason: null,
    servedModel: null,
    error: null,
    feedback: null,
    seq: null,
    createdAt: new Date().toISOString(),
  }
}

export function isLocalMessage(message: ChatMessage) {
  return message.id.startsWith("local-")
}

type UseChatOptions = {
  conversationId: string | null
  initialMessages: ChatMessage[]
  hasEarlier: boolean
  projectId: string | null
  getModel: () => ModelRef | null
  /** Called when a send fails before anything was stored, to restore the draft. */
  onRestoreDraft?: (content: string, attachments: Attachment[]) => void
}

export function useChat(options: UseChatOptions) {
  const actions = useActions()
  const [state, dispatch] = useReducer(reducer, null, () => ({
    conversationId: options.conversationId,
    messages: options.initialMessages,
    status: "idle" as Status,
    hasEarlier: options.hasEarlier,
    loadingEarlier: false,
    requestError: null,
  }))

  // Latest values for the stable callbacks below; synced after every commit.
  const stateRef = useRef(state)
  const optionsRef = useRef(options)
  useLayoutEffect(() => {
    stateRef.current = state
    optionsRef.current = options
  })
  const abortRef = useRef<AbortController | null>(null)

  // A server refresh (e.g. after a background reply finished) brings new messages.
  const initialRef = useRef(options.initialMessages)
  useEffect(() => {
    if (initialRef.current === options.initialMessages) return
    initialRef.current = options.initialMessages
    if (stateRef.current.status === "idle") {
      dispatch({ type: "reset", messages: options.initialMessages, hasEarlier: options.hasEarlier })
    }
  }, [options.initialMessages, options.hasEarlier])

  const run = useCallback(
    async (
      body: ChatRequestBody,
      context: { snapshot: ChatMessage[]; placeholderId: string; tempUserId: string | null; draft?: { content: string; attachments: Attachment[] } },
    ) => {
      const controller = new AbortController()
      abortRef.current = controller
      let assistantId = context.placeholderId
      let started = false
      let settled = false
      let pending = { text: "", reasoning: "" }
      let frame = 0

      const flush = () => {
        frame = 0
        if (!pending.text && !pending.reasoning) return
        dispatch({ type: "append", id: assistantId, ...pending })
        pending = { text: "", reasoning: "" }
      }
      const schedule = () => {
        if (!frame) frame = requestAnimationFrame(flush)
      }

      try {
        for await (const event of streamChatRequest(body, controller.signal)) {
          if (event.type === "start") {
            started = true
            dispatch({
              type: "started",
              conversationId: event.conversationId,
              userMessage: event.userMessage,
              tempUserId: context.tempUserId,
              placeholderId: context.placeholderId,
              assistantId: event.assistantMessageId,
            })
            assistantId = event.assistantMessageId
            actions.setStreaming(event.conversationId)
            const now = new Date().toISOString()
            if (event.createdConversation) {
              window.history.replaceState(null, "", `/app/chat/${event.conversationId}`)
              actions.upsertConversation({
                id: event.conversationId,
                title: event.conversationTitle,
                projectId: optionsRef.current.projectId,
                provider: body.provider,
                model: body.model,
                lastMessageAt: now,
                createdAt: now,
              })
            } else {
              actions.patchConversation(event.conversationId, { lastMessageAt: now, provider: body.provider, model: body.model })
            }
          } else if (event.type === "text") {
            pending.text += event.delta
            schedule()
          } else if (event.type === "reasoning") {
            pending.reasoning += event.delta
            schedule()
          } else if (event.type === "done") {
            cancelAnimationFrame(frame)
            flush()
            settled = true
            dispatch({ type: "replace", id: assistantId, message: event.message })
          } else if (event.type === "error") {
            cancelAnimationFrame(frame)
            flush()
            settled = true
            if (event.message) dispatch({ type: "replace", id: assistantId, message: event.message })
            else dispatch({ type: "fail", id: assistantId, error: event.error })
          }
        }
      } catch (error) {
        cancelAnimationFrame(frame)
        flush()
        if (controller.signal.aborted) {
          // The server notices the disconnect and stores the partial reply as stopped.
        } else if (error instanceof ChatRequestError && !started) {
          settled = true
          dispatch({ type: "rollback", messages: context.snapshot, error: error.payload })
          if (context.draft) optionsRef.current.onRestoreDraft?.(context.draft.content, context.draft.attachments)
        } else {
          settled = true
          dispatch({
            type: "fail",
            id: assistantId,
            error: error instanceof ChatRequestError ? error.payload : toApiError("network_error"),
          })
        }
      } finally {
        if (!settled) dispatch({ type: "settle", id: assistantId, cancelled: controller.signal.aborted })
        if (abortRef.current === controller) abortRef.current = null
        actions.setStreaming(null)
      }
    },
    [actions],
  )

  const send = useCallback(
    (content: string, attachments: Attachment[]) => {
      const model = optionsRef.current.getModel()
      if (!model) {
        dispatch({ type: "rollback", messages: stateRef.current.messages, error: toApiError("provider_not_configured") })
        return false
      }
      const snapshot = stateRef.current.messages
      const user = localMessage("user", content, attachments)
      const placeholder = localMessage("assistant", "", [], model)
      dispatch({ type: "begin", messages: [...snapshot, user, placeholder] })
      void run(
        {
          conversationId: stateRef.current.conversationId,
          projectId: optionsRef.current.projectId,
          provider: model.provider,
          model: model.model,
          action: "send",
          content,
          attachments,
        },
        { snapshot, placeholderId: placeholder.id, tempUserId: user.id, draft: { content, attachments } },
      )
      return true
    },
    [run],
  )

  const regenerate = useCallback(
    (messageId: string) => {
      const model = optionsRef.current.getModel()
      const { messages, conversationId } = stateRef.current
      const index = messages.findIndex((message) => message.id === messageId)
      if (!model || index < 0 || !conversationId) return
      const target = messages[index]
      const keep = target.role === "assistant" ? messages.slice(0, index) : messages.slice(0, index + 1)
      const placeholder = localMessage("assistant", "", [], model)
      dispatch({ type: "begin", messages: [...keep, placeholder] })
      void run(
        { conversationId, provider: model.provider, model: model.model, action: "regenerate", targetMessageId: messageId },
        { snapshot: messages, placeholderId: placeholder.id, tempUserId: null },
      )
    },
    [run],
  )

  const edit = useCallback(
    (messageId: string, content: string) => {
      const model = optionsRef.current.getModel()
      const { messages, conversationId } = stateRef.current
      const index = messages.findIndex((message) => message.id === messageId)
      if (!model || index < 0 || !conversationId || !content.trim()) return
      const target = messages[index]
      const user = { ...localMessage("user", content.trim(), target.attachments) }
      const placeholder = localMessage("assistant", "", [], model)
      dispatch({ type: "begin", messages: [...messages.slice(0, index), user, placeholder] })
      void run(
        {
          conversationId,
          provider: model.provider,
          model: model.model,
          action: "edit",
          targetMessageId: messageId,
          content: content.trim(),
        },
        { snapshot: messages, placeholderId: placeholder.id, tempUserId: user.id },
      )
    },
    [run],
  )

  const continueMessage = useCallback(
    (messageId: string) => {
      const model = optionsRef.current.getModel()
      const { messages, conversationId } = stateRef.current
      if (!model || !conversationId) return
      dispatch({
        type: "begin",
        messages: messages.map((message) =>
          message.id === messageId ? { ...message, status: "streaming", error: null, finishReason: null } : message,
        ),
      })
      void run(
        { conversationId, provider: model.provider, model: model.model, action: "continue", targetMessageId: messageId },
        { snapshot: messages, placeholderId: messageId, tempUserId: null },
      )
    },
    [run],
  )

  const stop = useCallback(() => abortRef.current?.abort(), [])

  const loadEarlier = useCallback(async () => {
    const { messages, conversationId, loadingEarlier } = stateRef.current
    const oldest = messages.find((message) => message.seq !== null)
    if (!conversationId || !oldest?.seq || loadingEarlier) return
    dispatch({ type: "loadingEarlier", value: true })
    const before = oldest.seq
    const { data, error } = await getSupabaseBrowserClient()
      .then((supabase) =>
        supabase
          .from("messages")
          .select(MESSAGE_COLUMNS)
          .eq("conversation_id", conversationId)
          .lt("seq", before)
          .order("seq", { ascending: false })
          .limit(MESSAGE_PAGE_SIZE + 1),
      )
      .catch((caught: unknown) => ({ data: null, error: caught }))
    if (error || !data) {
      dispatch({ type: "loadingEarlier", value: false })
      toast.error("Couldn't load earlier messages")
      return
    }
    dispatch({
      type: "prepend",
      messages: data.slice(0, MESSAGE_PAGE_SIZE).map(toChatMessage).reverse(),
      hasEarlier: data.length > MESSAGE_PAGE_SIZE,
    })
  }, [])

  const setFeedback = useCallback(async (messageId: string, value: 1 | -1) => {
    const message = stateRef.current.messages.find((m) => m.id === messageId)
    if (!message || isLocalMessage(message)) return
    const next = message.feedback === value ? null : value
    dispatch({ type: "patch", id: messageId, patch: { feedback: next } })
    const { error } = await getSupabaseBrowserClient()
      .then((supabase) => supabase.from("messages").update({ feedback: next }).eq("id", messageId))
      .catch((caught: unknown) => ({ error: caught }))
    if (error) {
      dispatch({ type: "patch", id: messageId, patch: { feedback: message.feedback } })
      toast.error("Couldn't save your feedback")
    }
  }, [])

  const clearError = useCallback(() => dispatch({ type: "clearError" }), [])

  return { state, send, regenerate, edit, continueMessage, stop, loadEarlier, setFeedback, clearError }
}
