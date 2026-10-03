import { CircleHelp, Info, KeyRound, MessageSquareText, Palette, ShieldCheck, Sparkles, UserRound } from "lucide-react"

export const SETTINGS_SECTIONS = [
  { slug: "profile", label: "Profile", description: "Name, photo and account", icon: UserRound },
  { slug: "personalization", label: "Personalization", description: "How Nebula responds to you", icon: Sparkles },
  { slug: "appearance", label: "Appearance", description: "Theme and text size", icon: Palette },
  { slug: "providers", label: "AI providers", description: "Connect your API keys", icon: KeyRound },
  { slug: "chat", label: "Chat", description: "Sending and default model", icon: MessageSquareText },
  { slug: "privacy", label: "Privacy and data", description: "Export or delete your data", icon: ShieldCheck },
  { slug: "help", label: "Help", description: "Getting started and shortcuts", icon: CircleHelp },
  { slug: "about", label: "About", description: "Open source and legal", icon: Info },
] as const

export type SettingsSlug = (typeof SETTINGS_SECTIONS)[number]["slug"]
