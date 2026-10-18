"use client"

import { useCallback, useEffect, useLayoutEffect, useReducer, useRef } from "react"
import { toast } from "sonner"
import { toApiError, type ApiErrorPayload } from "@/lib/providers/errors"
import type { ModelRef } from "@/lib/providers/types"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { useActions } from "@/lib/workspace/context"
import { getLiveRun, mergeLiveRun, publishLiveRun, subscribeLiveRun, type LiveRun } from "./live-runs"
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
  | { type: "rollback"; messages: ChatMessage[]; error: ApiErrorPayload | null }
  | { type: "prepend"; messages: ChatMessage[]; hasEarlier: boolean }
  | { type: "patch"; id: string; patch: Partial<ChatMessage> }
  | { type: "loadingEarlier"; value: boolean }
  | { type: "clearError" }
  | { type: "reset"; messages: ChatMessage[]; hasEarlier: boolean }
  | { type: "sync"; run: LiveRun; base?: ChatMessage[] }

function reducer(state: ChatState, action: Action): ChatState {
  switch (action.type) {
    case "sync":
      // A turn started by an earlier visit to this conversation, followed through the registry.
      return {
        ...state,
        conversationId: action.run.conversationId,
        messages: mergeLiveRun(action.base ?? state.messages, action.run),
        status: action.run.done ? "idle" : "streaming",
      }
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
  const [state, dispatch] = useReducer(reducer, null, (): ChatState => {
    // Coming back to a conversation whose reply is still streaming: start from where it is.
    const live = getLiveRun(options.conversationId)
    return {
      conversationId: options.conversationId,
      messages: live ? mergeLiveRun(options.initialMessages, live) : options.initialMessages,
      status: live && !live.done ? "streaming" : "idle",
      hasEarlier: options.hasEarlier,
      loadingEarlier: false,
      requestError: null,
    }
  })

  // Latest values for the stable callbacks below; synced after every commit.
  const stateRef = useRef(state)
  const optionsRef = useRef(options)
  useLayoutEffect(() => {
    stateRef.current = state
    optionsRef.current = options
  })
  const abortRef = useRef<AbortController | null>(null)
  /** The registry token of the turn this screen is running itself, whose updates it already has. */
  const ownTurnRef = useRef<string | null>(null)

  // A server refresh (e.g. after a background reply finished) brings new messages.
  const initialRef = useRef(options.initialMessages)
  useEffect(() => {
    if (initialRef.current === options.initialMessages) return
    initialRef.current = options.initialMessages
    if (stateRef.current.status === "idle") {
      const live = getLiveRun(stateRef.current.conversationId)
      const messages = live ? mergeLiveRun(options.initialMessages, live) : options.initialMessages
      dispatch({ type: "reset", messages, hasEarlier: options.hasEarlier })
    }
  }, [options.initialMessages, options.hasEarlier])

  // Follow turns this screen didn't start: a reply that began before the user left
  // this chat and came back keeps streaming in here.
  useEffect(() => {
    const id = state.conversationId
    if (!id) return
    const sync = () => {
      const live = getLiveRun(id)
      if (!live || live.token === ownTurnRef.current) return
      // A failed edit or regenerate: back to the stored transcript, which still has what it replaced.
      dispatch({ type: "sync", run: live, base: live.restored ? optionsRef.current.initialMessages : undefined })
    }
    const unsubscribe = subscribeLiveRun(id, sync)
    // Catch anything published between the first render and now.
    sync()
    return unsubscribe
  }, [state.conversationId])

  const run = useCallback(
    async (
      body: ChatRequestBody,
      context: {
        snapshot: ChatMessage[]
        placeholderId: string
        tempUserId: string | null
        /** The reply as it starts: an empty placeholder, or the message being continued. */
        base: ChatMessage
        draft?: { content: string; attachments: Attachment[] }
      },
    ) => {
      const controller = new AbortController()
      abortRef.current = controller
      const token = crypto.randomUUID()
      ownTurnRef.current = token
      let assistantId = context.placeholderId
      let started = false
      let settled = false
      // The server keeps what an edit or regenerate replaces until the new reply has some text.
      const replacing = body.action === "edit" || body.action === "regenerate"
      let gotText = false
      let pending = { text: "", reasoning: "" }
      let streamed = 0
      let frame = 0
      let timer = 0

      // Mirrors this turn into the registry, so a screen opened later can follow it.
      let live: LiveRun | null = null
      const publish = (update: (run: LiveRun) => Partial<LiveRun>) => {
        if (!live) return
        live = { ...live, ...update(live) }
        // Clear the "streaming" flag first, so a following screen never flashes the waiting note.
        if (live.done) actions.setStreaming(null)
        publishLiveRun(live)
      }

      const flush = () => {
        frame = 0
        timer = 0
        if (!pending.text && !pending.reasoning) return
        const { text, reasoning } = pending
        dispatch({ type: "append", id: assistantId, text, reasoning })
        publish((run) => ({
          assistant: { ...run.assistant, content: run.assistant.content + text, reasoning: run.assistant.reasoning + reasoning },
        }))
        pending = { text: "", reasoning: "" }
      }
      // One render per frame, and fewer once a reply is long, so huge replies keep the page responsive.
      const schedule = () => {
        if (frame || timer) return
        if (streamed > 24_000) {
          timer = window.setTimeout(() => {
            timer = 0
            frame = requestAnimationFrame(flush)
          }, 80)
        } else {
          frame = requestAnimationFrame(flush)
        }
      }
      const cancelScheduled = () => {
        cancelAnimationFrame(frame)
        clearTimeout(timer)
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
            live = {
              conversationId: event.conversationId,
              token,
              user: event.userMessage,
              assistant: { ...context.base, id: event.assistantMessageId, status: "streaming" },
              removedFromSeq: event.removedFromSeq,
              done: false,
              stop: () => controller.abort(),
            }
            publishLiveRun(live)
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
            if (event.delta.trim()) gotText = true
            pending.text += event.delta
            streamed += event.delta.length
            schedule()
          } else if (event.type === "reasoning") {
            pending.reasoning += event.delta
            streamed += event.delta.length
            schedule()
          } else if (event.type === "done") {
            cancelScheduled()
            flush()
            settled = true
            dispatch({ type: "replace", id: assistantId, message: event.message })
            publish(() => ({ assistant: event.message, done: true }))
          } else if (event.type === "error") {
            cancelScheduled()
            flush()
            settled = true
            const failure = event.error
            if (event.restored) {
              dispatch({ type: "rollback", messages: context.snapshot, error: failure })
              publish(() => ({ done: true, restored: true }))
              continue
            }
            if (event.message) dispatch({ type: "replace", id: assistantId, message: event.message })
            else dispatch({ type: "fail", id: assistantId, error: failure })
            publish((run) => ({
              assistant: event.message ?? { ...run.assistant, status: "failed", error: failure },
              done: true,
            }))
          }
        }
      } catch (error) {
        cancelScheduled()
        flush()
        if (controller.signal.aborted) {
          // The server notices the disconnect and stores the partial reply as stopped.
        } else if (error instanceof ChatRequestError && !started) {
          settled = true
          dispatch({ type: "rollback", messages: context.snapshot, error: error.payload })
          if (context.draft) optionsRef.current.onRestoreDraft?.(context.draft.content, context.draft.attachments)
        } else {
          settled = true
          const failure = error instanceof ChatRequestError ? error.payload : toApiError("network_error")
          dispatch({ type: "fail", id: assistantId, error: failure })
          publish((run) => ({ assistant: { ...run.assistant, status: "failed", error: failure }, done: true }))
        }
      } finally {
        if (!settled && controller.signal.aborted && replacing && !gotText) {
          // Stopped before any text: the server keeps the transcript as it was.
          dispatch({ type: "rollback", messages: context.snapshot, error: null })
          publish(() => ({ done: true, restored: true }))
        } else if (!settled) {
          const cancelled = controller.signal.aborted
          dispatch({ type: "settle", id: assistantId, cancelled })
          publish((run) => ({
            assistant: cancelled
              ? { ...run.assistant, status: "cancelled", finishReason: "cancelled" }
              : { ...run.assistant, status: "failed", error: toApiError("network_error") },
            done: true,
          }))
        }
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
        { snapshot, placeholderId: placeholder.id, tempUserId: user.id, base: placeholder, draft: { content, attachments } },
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
        { snapshot: messages, placeholderId: placeholder.id, tempUserId: null, base: placeholder },
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
        { snapshot: messages, placeholderId: placeholder.id, tempUserId: user.id, base: placeholder },
      )
    },
    [run],
  )

  const continueMessage = useCallback(
    (messageId: string) => {
      const model = optionsRef.current.getModel()
      const { messages, conversationId } = stateRef.current
      const target = messages.find((message) => message.id === messageId)
      if (!model || !conversationId || !target) return
      const resumed: ChatMessage = { ...target, status: "streaming", error: null, finishReason: null }
      dispatch({ type: "begin", messages: messages.map((message) => (message.id === messageId ? resumed : message)) })
      void run(
        { conversationId, provider: model.provider, model: model.model, action: "continue", targetMessageId: messageId },
        { snapshot: messages, placeholderId: messageId, tempUserId: null, base: resumed },
      )
    },
    [run],
  )

  // A turn followed from an earlier visit is stopped through the registry.
  const stop = useCallback(() => {
    if (abortRef.current) abortRef.current.abort()
    else getLiveRun(stateRef.current.conversationId)?.stop()
  }, [])

  /** Fetches the previous page. Resolves false if it failed (the reader has been told). */
  const loadEarlier = useCallback(async (): Promise<boolean> => {
    const { messages, conversationId, loadingEarlier } = stateRef.current
    const oldest = messages.find((message) => message.seq !== null)
    if (!conversationId || !oldest?.seq || loadingEarlier) return true
    stateRef.current = { ...stateRef.current, loadingEarlier: true }
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
      return false
    }
    dispatch({
      type: "prepend",
      messages: data.slice(0, MESSAGE_PAGE_SIZE).map(toChatMessage).reverse(),
      hasEarlier: data.length > MESSAGE_PAGE_SIZE,
    })
    return true
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
