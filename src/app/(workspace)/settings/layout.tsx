import type { Metadata } from "next"
import { SettingsShell } from "@/components/settings/settings-shell"

export const metadata: Metadata = {
  title: { template: "%s – Settings – Nebula", default: "Settings – Nebula" },
  robots: { index: false, follow: false },
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <SettingsShell>{children}</SettingsShell>
}
