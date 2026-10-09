"use client"

import { MailCheck } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { DocsDialog } from "@/components/docs/docs-dialog"
import { Button } from "@/components/ui/button"
import { Field, Input } from "@/components/ui/field"
import { MIN_AGE } from "@/lib/legal"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { safeNextPath } from "@/lib/urls"
import { describeAuthError } from "./auth-errors"
import { Captcha, captchaEnabled, type CaptchaHandle } from "./captcha"
import { GoogleIcon } from "./google-icon"
import { PasswordInput } from "./password-input"
import { useFormError } from "./use-form-error"

type AuthFormProps = {
  mode: "signin" | "signup"
  googleEnabled: boolean
  signupDisabled: boolean
  next?: string
  initialError?: string | null
}

export function AuthForm({ mode, googleEnabled, signupDisabled, next, initialError }: AuthFormProps) {
  const router = useRouter()
  const destination = safeNextPath(next)

  // Warm up the auth client after hydration so the first submit isn't delayed.
  useEffect(() => {
    void getSupabaseBrowserClient()
  }, [])

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [pending, setPending] = useState<"email" | "google" | null>(null)
  const form = useFormError<"email" | "password" | "consent">(initialError ?? null)
  const [agreed, setAgreed] = useState(false)
  const [needsConfirmation, setNeedsConfirmation] = useState(false)
  const [resent, setResent] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const captchaRef = useRef<CaptchaHandle>(null)

  const isSignup = mode === "signup"
  const callbackUrl = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`
  const needsCaptcha = () => captchaEnabled && !captchaToken
  const consentMissing = isSignup && !agreed
  const CONSENT_ERROR = `Confirm you're at least ${MIN_AGE} and accept the Terms of Service to continue.`

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    form.clear()
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return form.fail("Enter a valid email address.", "email")
    if (!password) return form.fail("Enter your password.", "password")
    if (isSignup && password.length < 8) return form.fail("Use at least 8 characters for your password.", "password")
    if (consentMissing) return form.fail(CONSENT_ERROR, "consent")
    if (needsCaptcha()) return form.fail("Complete the verification check first.")
    setPending("email")
    try {
      const supabase = await getSupabaseBrowserClient()
      if (isSignup) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: callbackUrl(), captchaToken: captchaToken ?? undefined },
        })
        if (signUpError) throw signUpError
        // An existing, confirmed address comes back with no identities (no error, to prevent enumeration).
        if (data.user && data.user.identities?.length === 0) {
          form.fail("An account with this email already exists. Sign in instead.", "email")
          return
        }
        if (!data.session) {
          setNeedsConfirmation(true)
          return
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
          options: { captchaToken: captchaToken ?? undefined },
        })
        if (signInError) throw signInError
      }
      router.replace(destination)
      router.refresh()
    } catch (caught) {
      form.fail(describeAuthError(caught as Error))
    } finally {
      setPending(null)
      // Tokens are single-use; the next attempt needs a fresh one.
      captchaRef.current?.reset()
    }
  }

  async function onGoogle() {
    form.clear()
    if (consentMissing) return form.fail(CONSENT_ERROR, "consent")
    setPending("google")
    try {
      const supabase = await getSupabaseBrowserClient()
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callbackUrl() },
      })
      if (oauthError) throw oauthError
      // On success the browser navigates to Google; keep the pending state.
    } catch (caught) {
      form.fail(describeAuthError(caught as Error))
      setPending(null)
    }
  }

  async function resendConfirmation() {
    form.clear()
    if (needsCaptcha()) return form.fail("Complete the verification check first.")
    try {
      const supabase = await getSupabaseBrowserClient()
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: { emailRedirectTo: callbackUrl(), captchaToken: captchaToken ?? undefined },
      })
      if (resendError) throw resendError
      setResent(true)
    } catch (caught) {
      form.fail(describeAuthError(caught as Error))
    } finally {
      captchaRef.current?.reset()
    }
  }

  if (needsConfirmation) {
    return (
      <div className="flex flex-col items-start" aria-live="polite">
        <span className="flex size-11 items-center justify-center rounded-full bg-mist text-fg">
          <MailCheck className="size-5" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-[-0.02em]">Check your inbox</h1>
        <p className="mt-2 text-md text-fg-muted">
          We sent a confirmation link to <span className="font-medium text-fg">{email.trim()}</span>. Open it on this
          device to finish creating your account.
        </p>
        {form.message && (
          <p role="alert" className="mt-4 text-sm text-danger">
            {form.message}
          </p>
        )}
        {captchaEnabled && !resent && (
          <div className="mt-6 w-full">
            <Captcha ref={captchaRef} onToken={setCaptchaToken} />
          </div>
        )}
        <div className="mt-6 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={resendConfirmation} disabled={resent}>
            {resent ? "Link sent again" : "Resend link"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              // A new address gets its own confirmation screen, with Resend available again.
              setNeedsConfirmation(false)
              setResent(false)
              form.clear()
            }}
          >
            Use a different email
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-[-0.02em]">{isSignup ? "Create your account" : "Sign in to Nebula"}</h1>
      <p className="mt-2 text-md text-fg-muted">
        {isSignup
          ? "Nebula itself is free and open source. You'll connect your own AI provider keys after signing up; each provider bills you for what you use."
          : "Your AI workspace, with the models you bring."}
      </p>

      {isSignup && (
        <div className="mt-7 flex items-start gap-3">
          <input
            {...form.control("consent")}
            id="consent"
            type="checkbox"
            name="consent"
            aria-required="true"
            checked={agreed}
            onChange={(event) => {
              setAgreed(event.target.checked)
              form.edited("consent")
            }}
            className="mt-0.5 size-4 shrink-0 accent-accent"
          />
          <label htmlFor="consent" className="text-md text-fg-muted">
            I&apos;m at least {MIN_AGE} years old and I agree to the{" "}
            <Link href="/terms" target="_blank" className="rounded-xs font-medium text-fg underline underline-offset-4">
              Terms of Service
            </Link>
            . I&apos;ve read the{" "}
            <Link href="/privacy" target="_blank" className="rounded-xs font-medium text-fg underline underline-offset-4">
              Privacy Policy
            </Link>
            .
          </label>
        </div>
      )}

      {googleEnabled && (
        <>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className={isSignup ? "mt-6 w-full text-md" : "mt-7 w-full text-md"}
            onClick={onGoogle}
            loading={pending === "google"}
            disabled={pending !== null}
          >
            {pending !== "google" && <GoogleIcon className="size-[18px]" />}
            Continue with Google
          </Button>
          <div className="my-6 flex items-center gap-3 text-sm text-fg-subtle" role="separator">
            <span className="h-px flex-1 bg-line" />
            or
            <span className="h-px flex-1 bg-line" />
          </div>
        </>
      )}

      <form onSubmit={onSubmit} className={googleEnabled ? "flex flex-col gap-4" : "mt-7 flex flex-col gap-4"} noValidate>
        <Field label="Email">
          {(props) => (
            <Input
              {...props}
              {...form.control("email", props["aria-describedby"])}
              type="email"
              name="email"
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
        <div className="flex flex-col gap-1.5">
          <Field label="Password" description={isSignup ? "At least 8 characters." : undefined}>
            {(props) => (
              <PasswordInput
                {...props}
                {...form.control("password", props["aria-describedby"])}
                name="password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                required
                minLength={isSignup ? 8 : undefined}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)
                  form.edited("password")
                }}
              />
            )}
          </Field>
          {!isSignup && (
            <Link href="/forgot-password" className="self-end rounded-xs text-sm text-fg-muted hover:text-fg">
              Forgot password?
            </Link>
          )}
        </div>

        <Captcha ref={captchaRef} onToken={setCaptchaToken} />

        {form.message && (
          <p id={form.messageId} role="alert" className="rounded-md bg-danger-soft px-3 py-2.5 text-sm text-danger">
            {form.message}
          </p>
        )}

        <Button
          type="submit"
          size="lg"
          className="mt-1 w-full text-md"
          loading={pending === "email"}
          disabled={pending !== null}
        >
          {isSignup ? "Create account" : "Continue"}
        </Button>
        {isSignup && (
          <p className="text-center text-sm text-fg-muted">
            By creating an account{googleEnabled ? ", with email or Google," : ""} you agree to the{" "}
            <Link href="/terms" target="_blank" className="rounded-xs font-medium text-fg underline underline-offset-4">
              Terms of Service
            </Link>{" "}
            and confirm you&apos;ve read the{" "}
            <Link href="/privacy" target="_blank" className="rounded-xs font-medium text-fg underline underline-offset-4">
              Privacy Policy
            </Link>
            .
          </p>
        )}
      </form>

      {!signupDisabled && (
        <p className="mt-6 text-md text-fg-muted">
          {isSignup ? "Already have an account? " : "New to Nebula? "}
          <Link
            href={isSignup ? "/" : "/signup"}
            className="rounded-xs font-medium text-fg underline decoration-line-strong underline-offset-4 hover:decoration-fg"
          >
            {isSignup ? "Sign in" : "Create an account"}
          </Link>
        </p>
      )}

      <p className={signupDisabled ? "mt-6 text-md text-fg-muted" : "mt-2 text-md text-fg-muted"}>
        {isSignup ? "Want to know how it works first? " : "Need help? "}
        <DocsDialog>
          <button
            type="button"
            className="rounded-xs font-medium text-fg underline decoration-line-strong underline-offset-4 hover:decoration-fg"
          >
            Read the docs
          </button>
        </DocsDialog>
      </p>

      {!isSignup && googleEnabled && !signupDisabled && (
        <p className="mt-4 text-sm text-fg-muted">
          Signing in with Google for the first time creates an account. By doing so you confirm you&apos;re at least{" "}
          {MIN_AGE} and agree to the{" "}
          <Link href="/terms" className="rounded-xs underline underline-offset-4 hover:text-fg">
            Terms of Service
          </Link>
          ; see the{" "}
          <Link href="/privacy" className="rounded-xs underline underline-offset-4 hover:text-fg">
            Privacy Policy
          </Link>
          .
        </p>
      )}
    </div>
  )
}
