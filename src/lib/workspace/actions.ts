"use client"

import { toast } from "sonner"
import type { ProviderConnection, ProviderId, ProviderModels } from "@/lib/providers/types"
import { THEME_COOKIE } from "@/lib/settings"
import type { Store } from "@/lib/store"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { SIDEBAR_COOKIE } from "./constants"
import {
  CONVERSATION_COLUMNS,
  CONVERSATION_PAGE_SIZE,
  settingsToRow,
  toConversationSummary,
  toProject,
} from "./mappers"
import type { ConversationSummary, Profile, Project, UserSettings, WorkspaceState } from "./types"

const YEAR = 60 * 60 * 24 * 365

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${YEAR}; samesite=lax`
}

function sortConversations(list: ConversationSummary[]) {
  return [...list].sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))
}

function failed(message: string) {
  toast.error(message, { description: "Check your connection and try again." })
}

type Client = Awaited<ReturnType<typeof getSupabaseBrowserClient>>

/**
 * Runs a query on the lazily loaded client. A failure to load the client itself (offline,
 * a deploy mid-session) comes back as an ordinary error result, so callers roll back.
 */
async function query<T extends { error: unknown }>(
  run: (supabase: Client) => PromiseLike<T>,
): Promise<T | { data: null; error: Error }> {
  try {
    return await run(await getSupabaseBrowserClient())
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error(String(error)) }
  }
}

export type WorkspaceActions = ReturnType<typeof createWorkspaceActions>

export function createWorkspaceActions(store: Store<WorkspaceState>) {

  const actions = {
    // ── UI ──────────────────────────────────────────────────────────────
    setSidebarCollapsed(collapsed: boolean) {
      store.set({ sidebarCollapsed: collapsed })
      setCookie(SIDEBAR_COOKIE, collapsed ? "collapsed" : "expanded")
    },
    setMobileNavOpen(open: boolean) {
      store.set({ mobileNavOpen: open })
    },
    setSearchOpen(open: boolean) {
      store.set({ searchOpen: open })
    },
    startNewChat() {
      store.set((state) => ({ newChatNonce: state.newChatNonce + 1, mobileNavOpen: false }))
    },
    setStreaming(conversationId: string | null) {
      store.set({ streamingConversationId: conversationId })
    },

    // ── Conversations ───────────────────────────────────────────────────
    upsertConversation(summary: ConversationSummary) {
      store.set((state) => {
        const rest = state.conversations.filter((conversation) => conversation.id !== summary.id)
        return { conversations: sortConversations([summary, ...rest]) }
      })
    },

    patchConversation(id: string, patch: Partial<ConversationSummary>) {
      store.set((state) => ({
        conversations: sortConversations(
          state.conversations.map((conversation) => (conversation.id === id ? { ...conversation, ...patch } : conversation)),
        ),
      }))
    },

    async renameConversation(id: string, title: string) {
      const clean = title.trim().slice(0, 200)
      if (!clean) return false
      const previous = store.get().conversations
      actions.patchConversation(id, { title: clean })
      const { error } = await query((supabase) => supabase.from("conversations").update({ title: clean }).eq("id", id))
      if (error) {
        store.set({ conversations: previous })
        failed("Couldn't rename the conversation")
        return false
      }
      return true
    },

    async deleteConversation(id: string) {
      const previous = store.get().conversations
      store.set({ conversations: previous.filter((conversation) => conversation.id !== id) })
      const { error } = await query((supabase) => supabase.from("conversations").delete().eq("id", id))
      if (error) {
        store.set({ conversations: previous })
        failed("Couldn't delete the conversation")
        return false
      }
      return true
    },

    async moveConversation(id: string, projectId: string | null) {
      const previous = store.get().conversations
      store.set({
        conversations: previous.map((conversation) => (conversation.id === id ? { ...conversation, projectId } : conversation)),
      })
      const { error } = await query((supabase) => supabase.from("conversations").update({ project_id: projectId }).eq("id", id))
      if (error) {
        store.set({ conversations: previous })
        failed("Couldn't move the conversation")
        return false
      }
      return true
    },

    async refreshConversations() {
      const { data, error } = await query((supabase) => supabase
        .from("conversations")
        .select(CONVERSATION_COLUMNS)
        .order("last_message_at", { ascending: false })
        .limit(CONVERSATION_PAGE_SIZE + 1))
      if (error || !data) return
      store.set({
        conversations: data.slice(0, CONVERSATION_PAGE_SIZE).map(toConversationSummary),
        hasMoreConversations: data.length > CONVERSATION_PAGE_SIZE,
      })
    },

    async loadMoreConversations() {
      const current = store.get().conversations
      const oldest = current[current.length - 1]
      if (!oldest) return
      const { data, error } = await query((supabase) => supabase
        .from("conversations")
        .select(CONVERSATION_COLUMNS)
        .lt("last_message_at", oldest.lastMessageAt)
        .order("last_message_at", { ascending: false })
        .limit(CONVERSATION_PAGE_SIZE + 1))
      if (error || !data) return failed("Couldn't load older conversations")
      const known = new Set(current.map((conversation) => conversation.id))
      store.set({
        conversations: [
          ...current,
          ...data.slice(0, CONVERSATION_PAGE_SIZE).map(toConversationSummary).filter((c) => !known.has(c.id)),
        ],
        hasMoreConversations: data.length > CONVERSATION_PAGE_SIZE,
      })
    },

    async deleteAllConversations() {
      const { error } = await query((supabase) => supabase.rpc("delete_all_conversations"))
      if (error) {
        failed("Couldn't delete your conversations")
        return false
      }
      store.set({ conversations: [], hasMoreConversations: false })
      return true
    },

    // ── Projects ────────────────────────────────────────────────────────
    async createProject(input: { name: string; description: string; instructions: string }): Promise<Project | null> {
      const { data, error } = await query((supabase) => supabase
        .from("projects")
        .insert({
          name: input.name.trim().slice(0, 100),
          description: input.description.trim().slice(0, 500),
          instructions: input.instructions.trim().slice(0, 8000),
        })
        .select("*")
        .single())
      if (error || !data) {
        failed("Couldn't create the project")
        return null
      }
      const project = toProject(data)
      store.set((state) => ({ projects: [project, ...state.projects] }))
      return project
    },

    async updateProject(id: string, patch: Partial<Pick<Project, "name" | "description" | "instructions">>) {
      const previous = store.get().projects
      store.set({ projects: previous.map((project) => (project.id === id ? { ...project, ...patch } : project)) })
      const { error } = await query((supabase) => supabase.from("projects").update(patch).eq("id", id))
      if (error) {
        store.set({ projects: previous })
        failed("Couldn't update the project")
        return false
      }
      return true
    },

    async deleteProject(id: string) {
      const { projects, conversations } = store.get()
      store.set({
        projects: projects.filter((project) => project.id !== id),
        conversations: conversations.map((conversation) =>
          conversation.projectId === id ? { ...conversation, projectId: null } : conversation,
        ),
      })
      const { error } = await query((supabase) => supabase.from("projects").delete().eq("id", id))
      if (error) {
        store.set({ projects, conversations })
        failed("Couldn't delete the project")
        return false
      }
      return true
    },

    // ── Settings & profile ──────────────────────────────────────────────
    async updateSettings(patch: Partial<UserSettings>) {
      const previous = store.get().settings
      store.set({ settings: { ...previous, ...patch } })
      if (patch.theme) {
        document.documentElement.dataset.theme = patch.theme
        setCookie(THEME_COOKIE, patch.theme)
      }
      const { error } = await query((supabase) => supabase
        .from("user_settings")
        .update(settingsToRow(patch))
        .eq("user_id", store.get().viewer.id))
      if (error) {
        store.set({ settings: previous })
        if (patch.theme) {
          document.documentElement.dataset.theme = previous.theme
          setCookie(THEME_COOKIE, previous.theme)
        }
        failed("Couldn't save your settings")
        return false
      }
      return true
    },

    async updateProfile(patch: Partial<Pick<Profile, "displayName" | "avatarUrl">>) {
      const previous = store.get().profile
      store.set({ profile: { ...previous, ...patch } })
      const row: { display_name?: string | null; avatar_url?: string | null } = {}
      if (patch.displayName !== undefined) row.display_name = patch.displayName?.trim().slice(0, 80) || null
      if (patch.avatarUrl !== undefined) row.avatar_url = patch.avatarUrl
      const { error } = await query((supabase) => supabase.from("profiles").update(row).eq("id", store.get().viewer.id))
      if (error) {
        store.set({ profile: previous })
        failed("Couldn't update your profile")
        return false
      }
      return true
    },

    // ── Providers & models ──────────────────────────────────────────────
    setConnection(connection: ProviderConnection) {
      store.set((state) => ({
        connections: [...state.connections.filter((c) => c.provider !== connection.provider), connection],
        // Model lists depend on the key and options; refetch on next open.
        models: { ...state.models, status: "idle" },
      }))
    },

    removeConnection(provider: ProviderId) {
      store.set((state) => ({
        connections: state.connections.filter((connection) => connection.provider !== provider),
        models: {
          ...state.models,
          providers: state.models.providers.filter((entry) => entry.provider !== provider),
        },
      }))
    },

    async loadModels(options: { force?: boolean } = {}) {
      const { models } = store.get()
      if (models.status === "loading") return
      if (!options.force && models.status === "ready" && models.fetchedAt && Date.now() - models.fetchedAt < 5 * 60_000) {
        return
      }
      store.set({ models: { ...models, status: "loading" } })
      try {
        const response = await fetch("/api/models", { cache: "no-store" })
        if (!response.ok) throw new Error(String(response.status))
        const json = (await response.json()) as { providers: ProviderModels[] }
        store.set({ models: { status: "ready", providers: json.providers, fetchedAt: Date.now() } })
      } catch {
        store.set((state) => ({ models: { ...state.models, status: "error" } }))
      }
    },
  }

  return actions
}
