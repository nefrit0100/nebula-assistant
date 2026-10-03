"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { describeAuthError } from "./auth-errors"
import { PasswordInput } from "./password-input"
import { useFormError } from "./use-form-error"

export function ResetPasswordForm({ email }: { email: string | null }) {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [pending, setPending] = useState(false)
  const form = useFormError<"password" | "confirm">()

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    form.clear()
    if (password.length < 8) return form.fail("Use at least 8 characters.", "password")
    if (password !== confirm) return form.fail("The passwords don’t match.", "confirm")
    setPending(true)
    try {
      const supabase = await getSupabaseBrowserClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
    } catch (caught) {
      setPending(false)
      return form.fail(describeAuthError(caught as Error))
    }
    toast.success("Password updated")
    router.replace("/app")
    router.refresh()
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-[-0.02em]">Choose a new password</h1>
      <p className="mt-2 text-md text-fg-muted">
        {email ? (
          <>
            For <span className="font-medium text-fg">{email}</span>.
          </>
        ) : (
          "You'll stay signed in on this device."
        )}
      </p>
      <form onSubmit={onSubmit} className="mt-7 flex flex-col gap-4" noValidate>
        <Field label="New password" description="At least 8 characters.">
          {(props) => (
            <PasswordInput
              {...props}
              {...form.control("password", props["aria-describedby"])}
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                form.edited("password")
              }}
            />
          )}
        </Field>
        <Field label="Confirm new password">
          {(props) => (
            <PasswordInput
              {...props}
              {...form.control("confirm", props["aria-describedby"])}
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(event) => {
                setConfirm(event.target.value)
                form.edited("confirm")
              }}
            />
          )}
        </Field>
        {form.message && (
          <p id={form.messageId} role="alert" className="rounded-md bg-danger-soft px-3 py-2.5 text-sm text-danger">
            {form.message}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full text-md" loading={pending} disabled={!password || !confirm}>
          Update password
        </Button>
      </form>
    </div>
  )
}
