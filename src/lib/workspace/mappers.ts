import { isTextSize, isTheme } from "@/lib/settings"
import type { Tables } from "@/lib/supabase/database.types"
import { DEFAULT_SETTINGS, type ConversationSummary, type Project, type UserSettings } from "./types"

export const CONVERSATION_COLUMNS = "id, title, project_id, provider_id, model_id, last_message_at, created_at" as const
export const CONVERSATION_PAGE_SIZE = 100

type ConversationRow = Pick<
  Tables<"conversations">,
  "id" | "title" | "project_id" | "provider_id" | "model_id" | "last_message_at" | "created_at"
>

export function toConversationSummary(row: ConversationRow): ConversationSummary {
  return {
    id: row.id,
    title: row.title,
    projectId: row.project_id,
    provider: row.provider_id,
    model: row.model_id,
    lastMessageAt: row.last_message_at,
    createdAt: row.created_at,
  }
}

export function toProject(row: Tables<"projects">): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    instructions: row.instructions,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function toSettings(row: Tables<"user_settings"> | null): UserSettings {
  if (!row) return DEFAULT_SETTINGS
  return {
    nickname: row.nickname,
    aboutMe: row.about_me,
    customInstructions: row.custom_instructions,
    responseStyle: row.response_style,
    theme: isTheme(row.theme) ? row.theme : "system",
    textSize: isTextSize(row.text_size) ? row.text_size : "default",
    sendOnEnter: row.send_on_enter,
    showReasoning: row.show_reasoning,
    defaultProvider: row.default_provider,
    defaultModel: row.default_model,
  }
}

/** Settings fields → database columns, for partial updates. */
export function settingsToRow(patch: Partial<UserSettings>) {
  const row: Partial<Tables<"user_settings">> = {}
  if (patch.nickname !== undefined) row.nickname = patch.nickname
  if (patch.aboutMe !== undefined) row.about_me = patch.aboutMe
  if (patch.customInstructions !== undefined) row.custom_instructions = patch.customInstructions
  if (patch.responseStyle !== undefined) row.response_style = patch.responseStyle
  if (patch.theme !== undefined) row.theme = patch.theme
  if (patch.textSize !== undefined) row.text_size = patch.textSize
  if (patch.sendOnEnter !== undefined) row.send_on_enter = patch.sendOnEnter
  if (patch.showReasoning !== undefined) row.show_reasoning = patch.showReasoning
  if (patch.defaultProvider !== undefined) row.default_provider = patch.defaultProvider
  if (patch.defaultModel !== undefined) row.default_model = patch.defaultModel
  return row
}
