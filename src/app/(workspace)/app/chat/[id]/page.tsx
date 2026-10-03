import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { cache } from "react"
import { ChatView } from "@/components/chat/chat-view"
import { MESSAGE_COLUMNS, MESSAGE_PAGE_SIZE, toChatMessage } from "@/lib/chat/types"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { isUuid } from "@/lib/uuid"

/** RLS scopes this to the signed-in user: another user's id simply isn't found. */
const getConversation = cache(async (id: string) => {
  if (!isUuid(id)) return null
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from("conversations")
    .select("id, title, project_id, provider_id, model_id")
    .eq("id", id)
    .maybeSingle()
  return data
})

export async function generateMetadata(props: PageProps<"/app/chat/[id]">): Promise<Metadata> {
  const { id } = await props.params
  const conversation = await getConversation(id)
  return { title: conversation?.title ?? "Conversation" }
}

export default async function ChatPage(props: PageProps<"/app/chat/[id]">) {
  const { id } = await props.params
  const conversation = await getConversation(id)
  if (!conversation) notFound()

  const supabase = await createSupabaseServerClient()
  const { data: rows } = await supabase
    .from("messages")
    .select(MESSAGE_COLUMNS)
    .eq("conversation_id", id)
    .order("seq", { ascending: false })
    .limit(MESSAGE_PAGE_SIZE + 1)

  const page = rows ?? []
  const messages = page.slice(0, MESSAGE_PAGE_SIZE).map(toChatMessage).reverse()

  return (
    <ChatView
      key={id}
      conversationId={id}
      initialMessages={messages}
      hasEarlier={page.length > MESSAGE_PAGE_SIZE}
      projectId={conversation.project_id}
      conversationModel={{ provider: conversation.provider_id, model: conversation.model_id }}
    />
  )
}
