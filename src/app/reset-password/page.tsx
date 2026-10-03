import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { AuthShell } from "@/components/auth/auth-shell"
import { ResetPasswordForm } from "@/components/auth/reset-password-form"
import { getViewer } from "@/lib/server/auth"
import { getAuthSettings } from "@/lib/server/auth-settings"

export const metadata: Metadata = { title: "Choose a new password" }

/** Reached from a recovery link, which signs the user in first. */
export default async function ResetPasswordPage() {
  const [viewer, settings] = await Promise.all([getViewer(), getAuthSettings()])
  if (!viewer) redirect("/?error=link_expired")

  return (
    <AuthShell googleEnabled={settings.google}>
      <ResetPasswordForm email={viewer.email} />
    </AuthShell>
  )
}
