import type { Metadata } from "next"
import { AuthShell } from "@/components/auth/auth-shell"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"
import { getAuthSettings } from "@/lib/server/auth-settings"

export const metadata: Metadata = { title: "Reset your password" }

export default async function ForgotPasswordPage() {
  const settings = await getAuthSettings()
  return (
    <AuthShell googleEnabled={settings.google}>
      <ForgotPasswordForm />
    </AuthShell>
  )
}
