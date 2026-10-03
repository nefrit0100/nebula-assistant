"use client"

import type { ChatMessage } from "@/lib/chat/types"
import { useWorkspaceState } from "@/lib/workspace/context"
import { ChatView } from "./chat-view"

const NO_MESSAGES: ChatMessage[] = []

/**
 * A fresh conversation. Keyed by the "new chat" counter so the view resets even
 * when the URL is already /app (it is rewritten to /app/chat/:id once the
 * first reply starts, without remounting the streaming view).
 */
export function NewChat({ projectId }: { projectId: string | null }) {
  const nonce = useWorkspaceState((state) => state.newChatNonce)
  return (
    <ChatView
      key={`new-${nonce}-${projectId ?? ""}`}
      conversationId={null}
      initialMessages={NO_MESSAGES}
      hasEarlier={false}
      projectId={projectId}
      conversationModel={null}
    />
  )
}
