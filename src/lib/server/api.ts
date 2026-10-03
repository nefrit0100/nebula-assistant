import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import type { z } from "zod"
import { type ErrorCode, toApiError } from "@/lib/providers/errors"
import type { Database } from "@/lib/supabase/database.types"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getViewer, type Viewer } from "./auth"

const NO_STORE = { "cache-control": "no-store" }

export function jsonError(code: ErrorCode, status: number, detail?: string) {
  return Response.json({ error: toApiError(code, detail) }, { status, headers: NO_STORE })
}

export function json<T>(body: T, init?: ResponseInit) {
  return Response.json(body, { ...init, headers: { ...NO_STORE, ...init?.headers } })
}

type Authed = { viewer: Viewer; supabase: SupabaseClient<Database> }

/** Route-handler guard: verified session or a 401 response. */
export async function authenticate(): Promise<Authed | Response> {
  const viewer = await getViewer()
  if (!viewer) return jsonError("unauthenticated", 401)
  return { viewer, supabase: await createSupabaseServerClient() }
}

/** Parses and validates a JSON body; returns a 400 response on failure. */
export async function parseBody<S extends z.ZodType>(request: Request, schema: S): Promise<z.infer<S> | Response> {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return jsonError("invalid_input", 400, "Request body must be JSON.")
  }
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return jsonError("invalid_input", 400, issue ? `${issue.path.join(".") || "body"}: ${issue.message}` : undefined)
  }
  return parsed.data
}

/** Buckets consume_rate_limit accepts; keep in sync with its allowlist in the migrations. */
type RateLimitBucket = "chat" | "credentials" | "models"

/** Fixed-window limiter backed by the consume_rate_limit RPC. Fails open on DB errors. */
export async function rateLimit(
  supabase: SupabaseClient<Database>,
  bucket: RateLimitBucket,
  max: number,
  windowSeconds: number,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("consume_rate_limit", {
    p_bucket: bucket,
    p_max: max,
    p_window_seconds: windowSeconds,
  })
  if (error) return true
  return data?.[0]?.allowed ?? true
}
