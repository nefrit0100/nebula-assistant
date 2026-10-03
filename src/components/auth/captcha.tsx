"use client"

import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react"
import { publicEnv } from "@/lib/env"

type Turnstile = {
  render(container: HTMLElement, options: Record<string, unknown>): string
  reset(widgetId?: string): void
  remove(widgetId?: string): void
}

declare global {
  interface Window {
    turnstile?: Turnstile
  }
}

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
let scriptPromise: Promise<void> | null = null

function loadTurnstile(): Promise<void> {
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script")
    script.src = SCRIPT_URL
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      scriptPromise = null
      script.remove()
      reject(new Error("Turnstile failed to load"))
    }
    document.head.appendChild(script)
  })
  return scriptPromise
}

export const captchaEnabled = Boolean(publicEnv.turnstileSiteKey)

export type CaptchaHandle = {
  /** Tokens are single-use: call after every attempt so the next one gets a fresh token. */
  reset: () => void
}

/**
 * Cloudflare Turnstile bot check. Supabase Auth verifies the token server-side
 * (Authentication → Bot and Abuse Protection), so bots calling the auth API
 * directly are stopped too. Renders nothing unless a site key is configured.
 */
export const Captcha = forwardRef<CaptchaHandle, { onToken: (token: string | null) => void }>(function Captcha(
  { onToken },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<string | null>(null)
  const onTokenRef = useRef(onToken)
  const [failed, setFailed] = useState(false)

  useLayoutEffect(() => {
    onTokenRef.current = onToken
  })

  useImperativeHandle(
    ref,
    () => ({
      reset() {
        onTokenRef.current(null)
        if (widgetRef.current) window.turnstile?.reset(widgetRef.current)
      },
    }),
    [],
  )

  useEffect(() => {
    if (!publicEnv.turnstileSiteKey) return
    let cancelled = false
    loadTurnstile()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return
        widgetRef.current = window.turnstile.render(containerRef.current, {
          sitekey: publicEnv.turnstileSiteKey,
          theme: "auto",
          size: "flexible",
          callback: (token: string) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(null),
          "error-callback": () => onTokenRef.current(null),
        })
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
      if (widgetRef.current) window.turnstile?.remove(widgetRef.current)
      widgetRef.current = null
    }
  }, [])

  if (!captchaEnabled) return null
  return (
    <div>
      <div ref={containerRef} className="min-h-[65px]" />
      {failed && (
        <p role="alert" className="mt-1 text-sm text-danger">
          Couldn’t load the verification check. Check your connection and reload the page.
        </p>
      )}
    </div>
  )
})
