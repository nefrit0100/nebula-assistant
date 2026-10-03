/** Client-safe error vocabulary shared by the API routes and the UI. */

export const ERROR_CODES = [
  "unauthenticated",
  "provider_not_configured",
  "credential_unreadable",
  "invalid_api_key",
  "permission_denied",
  "insufficient_quota",
  "rate_limited",
  "nebula_rate_limited",
  "model_not_found",
  "context_length_exceeded",
  "content_refused",
  "provider_overloaded",
  "provider_unavailable",
  "bad_request",
  "network_error",
  "timeout",
  "not_found",
  "invalid_input",
  "unknown",
] as const

export type ErrorCode = (typeof ERROR_CODES)[number]

export type ApiErrorPayload = {
  code: ErrorCode
  message: string
  /** Sanitized technical detail (status, provider message) for the "Details" disclosure. */
  detail?: string
  retryable?: boolean
}

type ErrorCopy = { title: string; hint?: string; retryable: boolean }

export const ERROR_COPY: Record<ErrorCode, ErrorCopy> = {
  unauthenticated: {
    title: "Your session has ended.",
    hint: "Sign in again to continue.",
    retryable: false,
  },
  provider_not_configured: {
    title: "Connect a provider to start chatting.",
    hint: "Nebula uses your own provider credentials.",
    retryable: false,
  },
  credential_unreadable: {
    title: "This saved key can't be read anymore.",
    hint: "Reconnect the provider in Settings → AI providers.",
    retryable: false,
  },
  invalid_api_key: {
    title: "We couldn't authenticate with this provider.",
    hint: "Check or replace the API key in Settings → AI providers.",
    retryable: false,
  },
  permission_denied: {
    title: "This key doesn't have access to that model.",
    hint: "Choose another model, or check the key's permissions with the provider.",
    retryable: false,
  },
  insufficient_quota: {
    title: "The provider account is out of credits or quota.",
    hint: "Top up or raise limits in the provider's console, then retry.",
    retryable: true,
  },
  rate_limited: {
    title: "This provider is temporarily rate-limiting requests.",
    hint: "Wait a moment and try again.",
    retryable: true,
  },
  nebula_rate_limited: {
    title: "You're sending messages very quickly.",
    hint: "Wait a few seconds and try again.",
    retryable: true,
  },
  model_not_found: {
    title: "This model isn't available for your key.",
    hint: "Choose another model.",
    retryable: false,
  },
  context_length_exceeded: {
    title: "This conversation is too long for the selected model.",
    hint: "Start a new conversation, or pick a model with a larger context window.",
    retryable: false,
  },
  content_refused: {
    title: "The model declined to answer this request.",
    hint: "Try rephrasing, or choose a different model.",
    retryable: true,
  },
  provider_overloaded: {
    title: "The provider is overloaded right now.",
    hint: "Try again in a few moments.",
    retryable: true,
  },
  provider_unavailable: {
    title: "The provider is having trouble responding.",
    hint: "Try again shortly.",
    retryable: true,
  },
  bad_request: {
    title: "The provider rejected this request.",
    hint: "See details below. Choosing another model often helps.",
    retryable: true,
  },
  network_error: {
    title: "Connection interrupted. Try again.",
    retryable: true,
  },
  timeout: {
    title: "The provider took too long to respond.",
    hint: "Try again, or choose a faster model.",
    retryable: true,
  },
  not_found: {
    title: "We couldn't find that.",
    hint: "It may have been deleted.",
    retryable: false,
  },
  invalid_input: {
    title: "Something in that request wasn't valid.",
    retryable: false,
  },
  unknown: {
    title: "Something went wrong.",
    hint: "Try again. If it keeps happening, check the details below.",
    retryable: true,
  },
}

export function toApiError(code: ErrorCode, detail?: string): ApiErrorPayload {
  const copy = ERROR_COPY[code]
  return { code, message: copy.title, detail, retryable: copy.retryable }
}
