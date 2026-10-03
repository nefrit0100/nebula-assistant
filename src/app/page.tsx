import { redirect } from "next/navigation"
import { AuthForm } from "@/components/auth/auth-form"
import { CALLBACK_ERRORS } from "@/components/auth/auth-errors"
import { AuthShell } from "@/components/auth/auth-shell"
import { getViewer } from "@/lib/server/auth"
import { getAuthSettings } from "@/lib/server/auth-settings"
import { safeNextPath } from "@/lib/urls"

/** The gateway: signed-in visitors go straight to /app, everyone else signs in here. */
export default async function GatewayPage(props: PageProps<"/">) {
  const searchParams = await props.searchParams
  const next = safeNextPath(typeof searchParams.next === "string" ? searchParams.next : null)

  if (await getViewer()) redirect(next)

  const settings = await getAuthSettings()
  const errorKey = typeof searchParams.error === "string" ? searchParams.error : null

  return (
    <AuthShell googleEnabled={settings.google}>
      <AuthForm
        mode="signin"
        googleEnabled={settings.google}
        signupDisabled={settings.signupDisabled}
        next={next}
        initialError={errorKey ? (CALLBACK_ERRORS[errorKey] ?? CALLBACK_ERRORS.link_invalid) : null}
      />
    </AuthShell>
  )
}
