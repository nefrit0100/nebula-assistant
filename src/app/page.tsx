import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { AuthForm } from "@/components/auth/auth-form"
import { CALLBACK_ERRORS } from "@/components/auth/auth-errors"
import { AuthShell } from "@/components/auth/auth-shell"
import { JsonLd } from "@/components/site/json-ld"
import { homeStructuredData } from "@/lib/agents/structured-data"
import { getViewer } from "@/lib/server/auth"
import { getAuthSettings } from "@/lib/server/auth-settings"
import { safeNextPath } from "@/lib/urls"

export const metadata: Metadata = { alternates: { canonical: "/" } }

/** The gateway: signed-in visitors go straight to /app, everyone else signs in here. */
export default async function GatewayPage(props: PageProps<"/">) {
  const searchParams = await props.searchParams
  const next = safeNextPath(typeof searchParams.next === "string" ? searchParams.next : null)

  if (await getViewer()) redirect(next)

  const settings = await getAuthSettings()
  const errorKey = typeof searchParams.error === "string" ? searchParams.error : null

  return (
    <AuthShell googleEnabled={settings.google}>
      <JsonLd data={homeStructuredData()} />
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
