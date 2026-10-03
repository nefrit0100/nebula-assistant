import "server-only"

import { cache } from "react"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import {
  CONVERSATION_COLUMNS,
  CONVERSATION_PAGE_SIZE,
  toConversationSummary,
  toProject,
  toSettings,
} from "@/lib/workspace/mappers"
import type { WorkspaceSnapshot } from "@/lib/workspace/types"
import { requireViewer } from "./auth"
import { listConnections } from "./connections"

/** Everything the workspace shell needs, loaded in parallel once per navigation. */
export const loadWorkspace = cache(async (): Promise<WorkspaceSnapshot> => {
  const viewer = await requireViewer()
  const supabase = await createSupabaseServerClient()

  const [profile, settings, conversations, projects, connections] = await Promise.all([
    supabase.from("profiles").select("display_name, avatar_url, created_at").eq("id", viewer.id).maybeSingle(),
    supabase.from("user_settings").select("*").eq("user_id", viewer.id).maybeSingle(),
    supabase
      .from("conversations")
      .select(CONVERSATION_COLUMNS)
      .order("last_message_at", { ascending: false })
      .limit(CONVERSATION_PAGE_SIZE + 1),
    supabase.from("projects").select("*").order("updated_at", { ascending: false }),
    listConnections(supabase),
  ])

  const meta = viewer.userMetadata
  const conversationRows = conversations.data ?? []

  return {
    viewer: {
      id: viewer.id,
      email: viewer.email,
      authProviders: viewer.authProviders,
      identityAvatarUrl:
        typeof meta.avatar_url === "string" ? meta.avatar_url : typeof meta.picture === "string" ? meta.picture : null,
      identityName: typeof meta.full_name === "string" ? meta.full_name : typeof meta.name === "string" ? meta.name : null,
    },
    profile: {
      displayName: profile.data?.display_name ?? null,
      avatarUrl: profile.data?.avatar_url ?? null,
      createdAt: profile.data?.created_at ?? null,
    },
    settings: toSettings(settings.data),
    conversations: conversationRows.slice(0, CONVERSATION_PAGE_SIZE).map(toConversationSummary),
    hasMoreConversations: conversationRows.length > CONVERSATION_PAGE_SIZE,
    projects: (projects.data ?? []).map(toProject),
    connections,
  }
})
