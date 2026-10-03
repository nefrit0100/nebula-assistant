"use client"

import { MailCheck } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Field, Input } from "@/components/ui/field"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { describeAuthError } from "./auth-errors"
import { useFormError } from "./use-form-error"

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("")
  const [pending, setPending] = useState(false)
  const form = useFormError<"email">()
  const [sent, setSent] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    form.clear()
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return form.fail("Enter a valid email address.", "email")
    setPending(true)
    try {
      const supabase = await getSupabaseBrowserClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      })
      if (resetError) throw resetError
      setSent(true)
    } catch (caught) {
      form.fail(describeAuthError(caught as Error))
    } finally {
      setPending(false)
    }
  }

  if (sent) {
    return (
      <div aria-live="polite">
        <span className="flex size-11 items-center justify-center rounded-full bg-mist">
          <MailCheck className="size-5" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-[-0.02em]">Check your inbox</h1>
        <p className="mt-2 text-md text-fg-muted">
          If an account exists for <span className="font-medium text-fg">{email.trim()}</span>, we sent a link to choose
          a new password. It expires in one hour.
        </p>
        <Button asChild variant="secondary" className="mt-6">
          <Link href="/">Back to sign in</Link>
        </Button>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-[-0.02em]">Reset your password</h1>
      <p className="mt-2 text-md text-fg-muted">Enter your account email and we’ll send you a reset link.</p>
      <form onSubmit={onSubmit} className="mt-7 flex flex-col gap-4" noValidate>
        <Field label="Email">
          {(props) => (
            <Input
              {...props}
              {...form.control("email", props["aria-describedby"])}
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                form.edited("email")
              }}
              placeholder="you@example.com"
            />
          )}
        </Field>
        {form.message && (
          <p id={form.messageId} role="alert" className="rounded-md bg-danger-soft px-3 py-2.5 text-sm text-danger">
            {form.message}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full text-md" loading={pending} disabled={!email.trim()}>
          Send reset link
        </Button>
      </form>
      <p className="mt-6 text-md text-fg-muted">
        Remembered it?{" "}
        <Link href="/" className="rounded-xs font-medium text-fg underline decoration-line-strong underline-offset-4 hover:decoration-fg">
          Sign in
        </Link>
      </p>
    </div>
  )
}
