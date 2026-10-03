import type { ProviderConnection, ProviderModels } from "@/lib/providers/types"
import type { TextSize, ThemePreference } from "@/lib/settings"

export type ConversationSummary = {
  id: string
  title: string
  projectId: string | null
  provider: string | null
  model: string | null
  lastMessageAt: string
  createdAt: string
}

export type Project = {
  id: string
  name: string
  description: string
  instructions: string
  createdAt: string
  updatedAt: string
}

export type UserSettings = {
  nickname: string
  aboutMe: string
  customInstructions: string
  responseStyle: string
  theme: ThemePreference
  textSize: TextSize
  sendOnEnter: boolean
  showReasoning: boolean
  defaultProvider: string | null
  defaultModel: string | null
}

export type Profile = {
  displayName: string | null
  avatarUrl: string | null
  createdAt: string | null
}

export type ViewerInfo = {
  id: string
  email: string | null
  /** Sign-in methods linked to the account, e.g. ["email", "google"]. */
  authProviders: string[]
  identityAvatarUrl: string | null
  identityName: string | null
}

export type WorkspaceSnapshot = {
  viewer: ViewerInfo
  profile: Profile
  settings: UserSettings
  conversations: ConversationSummary[]
  hasMoreConversations: boolean
  projects: Project[]
  connections: ProviderConnection[]
}

export type ModelsState = {
  status: "idle" | "loading" | "ready" | "error"
  providers: ProviderModels[]
  fetchedAt: number | null
}

export type WorkspaceState = WorkspaceSnapshot & {
  models: ModelsState
  sidebarCollapsed: boolean
  mobileNavOpen: boolean
  searchOpen: boolean
  /** Bumped by "New chat" so the composer resets even when the URL is already /app. */
  newChatNonce: number
  /** Conversation currently streaming a reply, for the sidebar indicator. */
  streamingConversationId: string | null
}

export const DEFAULT_SETTINGS: UserSettings = {
  nickname: "",
  aboutMe: "",
  customInstructions: "",
  responseStyle: "balanced",
  theme: "system",
  textSize: "default",
  sendOnEnter: true,
  showReasoning: true,
  defaultProvider: null,
  defaultModel: null,
}
