import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { AuthForm } from "@/components/auth/auth-form"
import { AuthShell } from "@/components/auth/auth-shell"
import { getViewer } from "@/lib/server/auth"
import { getAuthSettings } from "@/lib/server/auth-settings"
import { safeNextPath } from "@/lib/urls"

export const metadata: Metadata = { title: "Create your account" }

export default async function SignupPage(props: PageProps<"/signup">) {
  const searchParams = await props.searchParams
  const next = safeNextPath(typeof searchParams.next === "string" ? searchParams.next : null)
  if (await getViewer()) redirect(next)

  const settings = await getAuthSettings()
  if (settings.signupDisabled) redirect("/")

  return (
    <AuthShell googleEnabled={settings.google}>
      <AuthForm mode="signup" googleEnabled={settings.google} signupDisabled={false} next={next} />
    </AuthShell>
  )
}
