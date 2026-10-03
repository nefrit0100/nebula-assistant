"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { useChat } from "@/lib/chat/use-chat"
import { useModelSelection } from "@/lib/chat/use-model-selection"
import type { ChatMessage } from "@/lib/chat/types"
import { shallowEqual } from "@/lib/store"
import { useWorkspaceState } from "@/lib/workspace/context"
import { ChatHeader } from "./chat-header"
import { Composer, type ComposerHandle } from "./composer"
import { ConnectProviderCard, EmptyHeading, SuggestionChips, type Suggestion } from "./empty-state"
import { ErrorNotice } from "./error-notice"
import { loadMarkdown } from "./message"
import { MessageList } from "./message-list"
import { ModelSelector } from "./model-selector"

type ChatViewProps = {
  conversationId: string | null
  initialMessages: ChatMessage[]
  hasEarlier: boolean
  projectId: string | null
  conversationModel: { provider: string | null; model: string | null } | null
}

export function ChatView({ conversationId, initialMessages, hasEarlier, projectId, conversationModel }: ChatViewProps) {
  const router = useRouter()
  const composerRef = useRef<ComposerHandle>(null)
  const [sendToken, setSendToken] = useState(0)

  const settings = useWorkspaceState(
    (state) => ({
      sendOnEnter: state.settings.sendOnEnter,
      showReasoning: state.settings.showReasoning,
      textSize: state.settings.textSize,
    }),
    shallowEqual,
  )
  const projectName = useWorkspaceState((state) =>
    projectId ? (state.projects.find((project) => project.id === projectId)?.name ?? null) : null,
  )
  const modelsState = useWorkspaceState((state) => state.models.providers)
  const streamingId = useWorkspaceState((state) => state.streamingConversationId)

  // Fetch the Markdown renderer once the page is idle, before the first reply needs it.
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((callback: () => void) => window.setTimeout(callback, 1500))
    const handle = idle(() => void loadMarkdown())
    return () => (window.cancelIdleCallback ?? window.clearTimeout)(handle)
  }, [])

  const model = useModelSelection(conversationModel)
  const modelRef = useRef(model.selected)
  useLayoutEffect(() => {
    modelRef.current = model.selected
  }, [model.selected])

  const chat = useChat({
    conversationId,
    initialMessages,
    hasEarlier,
    projectId,
    getModel: () => modelRef.current,
    onRestoreDraft: (content, attachments) => composerRef.current?.setDraft(content, attachments),
  })
  const { state } = chat
  const busy = state.status !== "idle"
  const empty = state.messages.length === 0

  // A reply for this conversation is still streaming from an earlier visit:
  // reload from the server once it lands.
  const streamingElsewhere = conversationId !== null && streamingId === conversationId && state.status === "idle"
  const wasStreamingElsewhere = useRef(streamingElsewhere)
  useEffect(() => {
    if (wasStreamingElsewhere.current && !streamingElsewhere) router.refresh()
    wasStreamingElsewhere.current = streamingElsewhere
  }, [streamingElsewhere, router])

  const modelNames = useMemo(() => {
    const names: Record<string, string> = {}
    for (const entry of modelsState) for (const m of entry.models) names[`${m.provider}::${m.id}`] = m.name
    return names
  }, [modelsState])

  const onSend = useCallback(
    (content: string, attachments: Parameters<typeof chat.send>[1]) => {
      const sent = chat.send(content, attachments)
      if (sent) setSendToken((token) => token + 1)
      return sent
    },
    [chat],
  )

  const onPickSuggestion = useCallback((suggestion: Suggestion) => {
    composerRef.current?.setDraft(suggestion.prompt)
    if (suggestion.attach) composerRef.current?.openFilePicker()
  }, [])

  const blockedReason = !model.hasProviders
    ? "Connect a provider first"
    : !model.selected
      ? "Choose a model first"
      : undefined

  const composer = (
    <Composer
      ref={composerRef}
      variant={empty ? "hero" : "docked"}
      autoFocus
      status={state.status}
      canSend={Boolean(model.selected)}
      blockedReason={blockedReason}
      sendOnEnter={settings.sendOnEnter}
      onSend={onSend}
      onStop={chat.stop}
      placeholder={empty ? "Ask anything" : "Reply to Nebula"}
      modelSelector={
        <ModelSelector selected={model.selected} selectedInfo={model.info} connected={model.connected} onSelect={model.select} />
      }
    />
  )

  const requestError = state.requestError && (
    <ErrorNotice className="mb-3" error={state.requestError} onDismiss={chat.clearError} />
  )

  if (empty) {
    return (
      <div className="flex h-full flex-col">
        <ChatHeader conversationId={null} />
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-6 sm:px-6">
          <div className="mx-auto flex w-full max-w-[47rem] flex-1 flex-col justify-center gap-8 py-8 sm:pb-[12vh]">
            <EmptyHeading projectName={projectName} />
            <div className="rise-in [animation-delay:180ms]">
              {requestError}
              {composer}
            </div>
            {model.hasProviders ? <SuggestionChips onPick={onPickSuggestion} /> : <ConnectProviderCard />}
          </div>
          <Disclaimer />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <ChatHeader conversationId={state.conversationId} />
      <MessageList
        messages={state.messages}
        busy={busy || streamingElsewhere}
        showReasoning={settings.showReasoning}
        textSize={settings.textSize}
        hasEarlier={state.hasEarlier}
        loadingEarlier={state.loadingEarlier}
        onLoadEarlier={chat.loadEarlier}
        modelNames={modelNames}
        sendToken={sendToken}
        onRegenerate={chat.regenerate}
        onEdit={(id, content) => {
          chat.edit(id, content)
          setSendToken((token) => token + 1)
        }}
        onContinue={chat.continueMessage}
        onFeedback={chat.setFeedback}
        footer={
          streamingElsewhere ? (
            <p role="status" className="text-md text-fg-subtle">
              Nebula is still writing this reply. It will appear here when it’s done.
            </p>
          ) : null
        }
      />
      <div className="shrink-0 px-3 pb-[max(env(safe-area-inset-bottom),12px)] sm:px-6">
        <div className="mx-auto w-full max-w-[47rem]">
          {requestError}
          {composer}
          <Disclaimer />
        </div>
      </div>
    </div>
  )
}

function Disclaimer() {
  return (
    <p className="mt-2 text-center text-xs text-fg-subtle">
      AI can make mistakes. Check important information.
    </p>
  )
}
