/**
 * Client-safe registry for user preferences. The database stores these as
 * format-checked text, so adding an option here needs no migration.
 */

export type ResponseStyle = {
  value: string
  label: string
  description: string
  instruction: string
}

export const RESPONSE_STYLES: ResponseStyle[] = [
  {
    value: "concise",
    label: "Concise",
    description: "Short, direct answers.",
    instruction:
      "Be concise. Lead with the answer, keep explanations brief, and skip preamble. Expand only when the user asks or the task truly requires it.",
  },
  {
    value: "balanced",
    label: "Balanced",
    description: "Clear answers with useful context.",
    instruction:
      "Answer clearly with the context needed to understand and act on the answer. Match length to the complexity of the question.",
  },
  {
    value: "detailed",
    label: "Detailed",
    description: "Thorough explanations and examples.",
    instruction:
      "Be thorough. Explain reasoning step by step, cover relevant edge cases and trade-offs, and include examples where they help.",
  },
]

export const THEMES = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const

export const TEXT_SIZES = [
  { value: "compact", label: "Compact", description: "15px" },
  { value: "default", label: "Default", description: "16px" },
  { value: "large", label: "Large", description: "18px" },
] as const

export type ThemePreference = (typeof THEMES)[number]["value"]
export type TextSize = (typeof TEXT_SIZES)[number]["value"]

export const THEME_COOKIE = "nebula-theme"

export function isTheme(value: unknown): value is ThemePreference {
  return THEMES.some((theme) => theme.value === value)
}

export function isTextSize(value: unknown): value is TextSize {
  return TEXT_SIZES.some((size) => size.value === value)
}

export function responseStyleFor(value: string | null | undefined): ResponseStyle {
  return RESPONSE_STYLES.find((style) => style.value === value) ?? RESPONSE_STYLES[1]
}

export const LIMITS = {
  nickname: 60,
  aboutMe: 2000,
  customInstructions: 4000,
  displayName: 80,
  projectName: 100,
  projectDescription: 500,
  projectInstructions: 8000,
  conversationTitle: 200,
  message: 100_000,
  attachmentBytes: 200_000,
  attachmentCount: 5,
} as const
