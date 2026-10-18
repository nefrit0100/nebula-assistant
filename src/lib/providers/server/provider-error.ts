import "server-only"

import Anthropic from "@anthropic-ai/sdk"
import OpenAI from "openai"
import { redactSecrets } from "@/lib/server/secrets"
import type { ErrorCode } from "../errors"

export class ProviderError extends Error {
  constructor(
    readonly code: ErrorCode,
    /** Sanitized technical detail, safe to show the signed-in user. */
    readonly detail?: string,
    readonly status?: number,
  ) {
    super(code)
    this.name = "ProviderError"
  }
}

export class AbortedError extends Error {
  constructor() {
    super("aborted")
    this.name = "AbortedError"
  }
}

const CONTEXT_PATTERNS = /context length|context window|maximum context|too many tokens|prompt is too long|input is too long|reduce the length/i
const QUOTA_PATTERNS = /insufficient[_ ]?(quota|balance|credit)|credit balance|out of credits|balance is (too low|insufficient)|exceeded your current quota|billing|arrearage|payment required/i
const MODEL_PATTERNS = /model[_ ]?not[_ ]?found|does not exist|unknown model|invalid model|no such model|model .* not (available|supported)|not a valid model/i

/** Maps any SDK, HTTP or network failure onto the shared error vocabulary. */
export function normalizeProviderError(error: unknown, secret?: string): ProviderError | AbortedError {
  if (error instanceof ProviderError || error instanceof AbortedError) return error

  if (
    error instanceof OpenAI.APIUserAbortError ||
    error instanceof Anthropic.APIUserAbortError ||
    (error instanceof Error && error.name === "AbortError")
  ) {
    return new AbortedError()
  }

  if (
    error instanceof OpenAI.APIConnectionTimeoutError ||
    error instanceof Anthropic.APIConnectionTimeoutError ||
    // What fetch rejects with when an AbortSignal.timeout() fires.
    (error instanceof Error && error.name === "TimeoutError")
  ) {
    return new ProviderError("timeout", "The request timed out before the provider responded.")
  }
  if (error instanceof OpenAI.APIConnectionError || error instanceof Anthropic.APIConnectionError) {
    return new ProviderError("network_error", "Could not reach the provider.")
  }

  if (error instanceof OpenAI.APIError || error instanceof Anthropic.APIError) {
    const status = typeof error.status === "number" ? error.status : undefined
    const message = redactSecrets(extractMessage(error), secret)
    const detail = status ? `HTTP ${status}${message ? ` — ${message}` : ""}` : message
    return new ProviderError(classify(status, message), truncate(detail), status)
  }

  if (error instanceof Error) {
    return new ProviderError("unknown", truncate(redactSecrets(error.message, secret)))
  }
  return new ProviderError("unknown")
}

/** Builds a ProviderError from a raw fetch response (adapters that don't use an SDK). */
export async function providerErrorFromResponse(response: Response, secret?: string): Promise<ProviderError> {
  let message = ""
  try {
    const body = await response.text()
    try {
      const json = JSON.parse(body) as { error?: { message?: string } | string; message?: string }
      message = typeof json.error === "string" ? json.error : (json.error?.message ?? json.message ?? body)
    } catch {
      message = body
    }
  } catch {
    // ignore unreadable bodies
  }
  message = redactSecrets(message.slice(0, 500), secret)
  return new ProviderError(
    classify(response.status, message),
    truncate(`HTTP ${response.status}${message ? ` — ${message}` : ""}`),
    response.status,
  )
}

function classify(status: number | undefined, message: string): ErrorCode {
  if (status === 401) return "invalid_api_key"
  if (status === 402) return "insufficient_quota"
  if (status === 403) return QUOTA_PATTERNS.test(message) ? "insufficient_quota" : "permission_denied"
  if (status === 404) return MODEL_PATTERNS.test(message) || !message ? "model_not_found" : "bad_request"
  if (status === 408) return "timeout"
  if (status === 413) return "context_length_exceeded"
  if (status === 429) return QUOTA_PATTERNS.test(message) ? "insufficient_quota" : "rate_limited"
  if (status === 529 || /overloaded/i.test(message)) return "provider_overloaded"
  if (status && status >= 500) return "provider_unavailable"
  if (status === 400 || status === 422) {
    if (CONTEXT_PATTERNS.test(message)) return "context_length_exceeded"
    if (QUOTA_PATTERNS.test(message)) return "insufficient_quota"
    if (MODEL_PATTERNS.test(message)) return "model_not_found"
    if (/api[_ ]?key|authentication|unauthori[sz]ed/i.test(message)) return "invalid_api_key"
    return "bad_request"
  }
  return "unknown"
}

function extractMessage(error: InstanceType<typeof OpenAI.APIError> | InstanceType<typeof Anthropic.APIError>): string {
  const body = error.error as { message?: unknown; error?: { message?: unknown } } | undefined
  const nested = body?.error?.message ?? body?.message
  if (typeof nested === "string" && nested) return nested
  return error.message.replace(/^\d{3}\s+/, "")
}

function truncate(value: string | undefined, max = 400): string | undefined {
  if (!value) return value
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}
