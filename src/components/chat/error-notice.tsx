"use client"

import { AlertCircle, RotateCcw, X } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/cn"
import { ERROR_COPY, type ApiErrorPayload, type ErrorCode } from "@/lib/providers/errors"

const SETTINGS_CODES: ErrorCode[] = [
  "provider_not_configured",
  "invalid_api_key",
  "credential_unreadable",
  "permission_denied",
  "insufficient_quota",
]

type ErrorNoticeProps = {
  error: ApiErrorPayload
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
}

/** Explains what went wrong and what to do — never a raw stack trace. */
export function ErrorNotice({ error, onRetry, onDismiss, className }: ErrorNoticeProps) {
  const copy = ERROR_COPY[error.code] ?? ERROR_COPY.unknown
  const showSettings = SETTINGS_CODES.includes(error.code)
  const signIn = error.code === "unauthenticated"

  return (
    <div role="alert" className={cn("rounded-lg border border-danger/20 bg-danger-soft/70 px-4 py-3.5", className)}>
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 size-[18px] shrink-0 text-danger" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-md font-medium text-fg">{error.message || copy.title}</p>
          {copy.hint && <p className="mt-0.5 text-sm text-fg-muted">{copy.hint}</p>}
          {(onRetry && copy.retryable) || showSettings || signIn ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {onRetry && copy.retryable && (
                <Button size="sm" variant="secondary" onClick={onRetry}>
                  <RotateCcw className="size-3.5" aria-hidden="true" />
                  Try again
                </Button>
              )}
              {showSettings && (
                <Button size="sm" variant="secondary" asChild>
                  <Link href="/settings/providers">Open provider settings</Link>
                </Button>
              )}
              {signIn && (
                <Button size="sm" asChild>
                  <Link href="/">Sign in</Link>
                </Button>
              )}
            </div>
          ) : null}
          {error.detail && (
            <details className="group mt-3">
              <summary className="w-fit select-none rounded-xs text-sm text-fg-subtle hover:text-fg-muted">Technical details</summary>
              <p className="mt-1.5 whitespace-pre-wrap break-words rounded-sm bg-bg/70 px-2.5 py-2 font-mono text-xs text-fg-muted">
                {error.detail}
              </p>
            </details>
          )}
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="-mr-1 -mt-0.5 inline-flex size-7 items-center justify-center rounded-xs text-fg-subtle hover:bg-hover hover:text-fg"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    </div>
  )
}
