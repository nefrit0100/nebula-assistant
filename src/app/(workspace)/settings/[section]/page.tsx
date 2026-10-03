import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { AboutSection } from "@/components/settings/about-section"
import { AppearanceSection } from "@/components/settings/appearance-section"
import { ChatSection } from "@/components/settings/chat-section"
import { HelpSection } from "@/components/settings/help-section"
import { PersonalizationSection } from "@/components/settings/personalization-section"
import { PrivacySection } from "@/components/settings/privacy-section"
import { ProfileSection } from "@/components/settings/profile-section"
import { ProvidersSection } from "@/components/settings/providers-section"
import { SETTINGS_SECTIONS, type SettingsSlug } from "@/components/settings/settings-nav"

const SECTIONS: Record<SettingsSlug, React.ComponentType> = {
  profile: ProfileSection,
  personalization: PersonalizationSection,
  appearance: AppearanceSection,
  providers: ProvidersSection,
  chat: ChatSection,
  privacy: PrivacySection,
  help: HelpSection,
  about: AboutSection,
}

function find(slug: string) {
  return SETTINGS_SECTIONS.find((section) => section.slug === slug)
}

export async function generateMetadata(props: PageProps<"/settings/[section]">): Promise<Metadata> {
  const { section } = await props.params
  return { title: find(section)?.label ?? "Settings" }
}

export default async function SettingsSectionPage(props: PageProps<"/settings/[section]">) {
  const { section } = await props.params
  const entry = find(section)
  if (!entry) notFound()
  const Section = SECTIONS[entry.slug]
  return <Section />
}
