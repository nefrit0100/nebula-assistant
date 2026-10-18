import { publicEnv } from "@/lib/env"
import { ERROR_CODES } from "@/lib/providers/errors"
import { PROVIDER_IDS } from "@/lib/providers/types"
import { LIMITS } from "@/lib/settings"

/**
 * The OpenAPI 3.1 description served at /openapi.json. It documents every route
 * handler under src/app/api; openapi.test.ts fails when a route or method is
 * missing here, or when an operation lacks an operationId, description or schema.
 */

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` })
const json = (schema: object) => ({ "application/json": { schema } })

/** Supabase's session cookie, named after the project: sb-<project-ref>-auth-token. */
const SESSION_COOKIE = `sb-${new URL(publicEnv.supabaseUrl).hostname.split(".")[0]}-auth-token`

function errorResponse(description: string) {
  return { description, content: json(ref("ErrorResponse")) }
}

const ERRORS = {
  400: errorResponse("The request was invalid. `error.code` says why (invalid_input, provider_not_configured, …)."),
  401: errorResponse("No valid signed-in session (`error.code` = unauthenticated). Sign in on the website first."),
  404: errorResponse("Unknown provider, conversation or message (`error.code` = not_found)."),
  429: errorResponse("Too many requests from this account (`error.code` = nebula_rate_limited). Wait and retry."),
  500: errorResponse("Unexpected server error (`error.code` = unknown). Safe to retry."),
}

const SESSION = [{ supabaseSession: [] }]

const providerParam = {
  name: "provider",
  in: "path",
  required: true,
  description: "Provider id.",
  schema: ref("ProviderId"),
}

const MODEL_ID = { type: "string", minLength: 1, maxLength: 200, pattern: "^[\\w.:/@+-]+$" }

export function openApiDocument(siteUrl = publicEnv.siteUrl) {
  return {
    openapi: "3.1.0",
    info: {
      title: "Nebula Assistant API",
      version: process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0",
      summary: "Public model catalog plus the session-authenticated endpoints behind the Nebula web app.",
      description: [
        "Nebula Assistant is a bring-your-own-key AI chat web app.",
        "",
        "- `GET /api/catalog` is public: no authentication, CORS enabled, cacheable.",
        "- Every other endpoint acts for a signed-in person and requires their Supabase session cookie, which is only issued by signing in on the website. There are no API keys for third-party apps or agents.",
        "",
        "Errors are always JSON: `{ \"error\": { \"code\", \"message\", \"detail\"?, \"hint\"?, \"retryable\"? } }`. `code` is stable and machine-readable; `hint` says how to resolve it.",
      ].join("\n"),
      license: { name: "MIT", identifier: "MIT" },
      ...(publicEnv.repoUrl ? { contact: { name: "Nebula Assistant", url: publicEnv.repoUrl } } : {}),
    },
    externalDocs: { description: "User docs", url: `${siteUrl}/docs` },
    servers: [{ url: siteUrl }],
    tags: [
      { name: "Catalog", description: "Public, read-only data about supported providers and models." },
      { name: "Providers", description: "The signed-in person's provider API keys (bring your own key)." },
      { name: "Chat", description: "Conversations with the person's chosen model." },
    ],
    paths: {
      "/api/catalog": {
        get: {
          operationId: "getCatalog",
          tags: ["Catalog"],
          summary: "List supported providers and curated models",
          description:
            "Returns every provider Nebula supports, where to create an API key for it, and the models Nebula has curated details for (context window, output limit, capabilities, listed pricing). A connected key can use more models than listed here. Public: no authentication.",
          security: [],
          responses: {
            200: {
              description: "The catalog.",
              headers: { "Cache-Control": { description: "public, max-age=3600", schema: { type: "string" } } },
              content: json(ref("Catalog")),
            },
          },
        },
      },
      "/api/providers": {
        get: {
          operationId: "listProviderConnections",
          tags: ["Providers"],
          summary: "List connected providers",
          description:
            "Lists the providers the signed-in person has saved a key for, with a masked key hint and verification status. Saved keys themselves are never returned.",
          security: SESSION,
          responses: {
            200: {
              description: "Connections.",
              content: json({
                type: "object",
                required: ["connections"],
                properties: { connections: { type: "array", items: ref("ProviderConnection") } },
              }),
            },
            401: ERRORS[401],
          },
        },
      },
      "/api/providers/{provider}": {
        parameters: [providerParam],
        put: {
          operationId: "saveProviderCredential",
          tags: ["Providers"],
          summary: "Save or update a provider key",
          description:
            "Verifies the key with the provider (without spending tokens), encrypts it and stores it for the signed-in person. Omit `apiKey` to change only the options of an existing connection. Rejects keys the provider says are invalid.",
          security: SESSION,
          requestBody: { required: true, content: json(ref("SaveCredentialRequest")) },
          responses: {
            200: {
              description: "The saved connection.",
              content: json({ type: "object", required: ["connection"], properties: { connection: ref("ProviderConnection") } }),
            },
            400: ERRORS[400],
            401: ERRORS[401],
            404: ERRORS[404],
            429: ERRORS[429],
            500: ERRORS[500],
          },
        },
        delete: {
          operationId: "deleteProviderCredential",
          tags: ["Providers"],
          summary: "Remove a provider key",
          description: "Deletes the signed-in person's saved key for this provider. Succeeds even if none was saved.",
          security: SESSION,
          responses: {
            200: {
              description: "Removed.",
              content: json({ type: "object", required: ["ok"], properties: { ok: { type: "boolean", const: true } } }),
            },
            401: ERRORS[401],
            404: ERRORS[404],
            500: ERRORS[500],
          },
        },
      },
      "/api/providers/{provider}/test": {
        parameters: [providerParam],
        post: {
          operationId: "testProviderCredential",
          tags: ["Providers"],
          summary: "Re-verify a saved provider key",
          description:
            "Checks the saved key with the provider again and records the outcome. A key the provider rejects still returns 200 with `ok: false` and the reason in `error`.",
          security: SESSION,
          responses: {
            200: {
              description: "Verification outcome.",
              content: json({
                type: "object",
                required: ["ok", "error", "connection"],
                properties: {
                  ok: { type: "boolean" },
                  error: { oneOf: [ref("ApiError"), { type: "null" }] },
                  connection: { oneOf: [ref("ProviderConnection"), { type: "null" }] },
                },
              }),
            },
            400: ERRORS[400],
            401: ERRORS[401],
            404: ERRORS[404],
            429: ERRORS[429],
          },
        },
      },
      "/api/models": {
        get: {
          operationId: "listAvailableModels",
          tags: ["Providers"],
          summary: "List models the signed-in person's keys can use",
          description:
            "Asks each connected provider which models the saved key can use, merged with curated details. A provider that fails is returned with `partial: true` and an `error` instead of failing the whole request.",
          security: SESSION,
          parameters: [
            {
              name: "provider",
              in: "query",
              required: false,
              description: "Only list models for this provider.",
              schema: ref("ProviderId"),
            },
          ],
          responses: {
            200: {
              description: "Models per connected provider.",
              content: json({
                type: "object",
                required: ["providers"],
                properties: { providers: { type: "array", items: ref("ProviderModels") } },
              }),
            },
            401: ERRORS[401],
            404: ERRORS[404],
            429: ERRORS[429],
          },
        },
      },
      "/api/chat": {
        post: {
          operationId: "sendChatMessage",
          tags: ["Chat"],
          summary: "Send a message and stream the reply",
          description:
            "Sends, edits, regenerates or continues a message in a conversation (a new one when `conversationId` is omitted) using the signed-in person's key for `provider`, and streams the reply as newline-delimited JSON events: `start`, then `text`/`reasoning` deltas, then `done` or `error`. Both the message and the reply are saved to the conversation.",
          security: SESSION,
          requestBody: { required: true, content: json(ref("ChatRequest")) },
          responses: {
            200: {
              description: "A stream of ChatStreamEvent objects, one JSON object per line.",
              content: { "application/x-ndjson": { schema: ref("ChatStreamEvent") } },
            },
            400: ERRORS[400],
            401: ERRORS[401],
            404: ERRORS[404],
            429: ERRORS[429],
            500: ERRORS[500],
          },
        },
      },
    },
    components: {
      securitySchemes: {
        supabaseSession: {
          type: "apiKey",
          in: "cookie",
          name: SESSION_COOKIE,
          description:
            "The session cookie set when a person signs in on the website. Large sessions are split across cookies with .0, .1, … appended to the name.",
        },
      },
      schemas: {
        ProviderId: { type: "string", enum: [...PROVIDER_IDS], description: "Supported provider." },
        ErrorCode: { type: "string", enum: [...ERROR_CODES], description: "Stable, machine-readable error code." },
        ApiError: {
          type: "object",
          required: ["code", "message"],
          properties: {
            code: ref("ErrorCode"),
            message: { type: "string", description: "Human-readable summary." },
            detail: { type: "string", description: "Sanitized technical detail, when available." },
            hint: { type: "string", description: "How to resolve the error." },
            retryable: { type: "boolean", description: "Whether retrying the same request may succeed." },
          },
        },
        ErrorResponse: { type: "object", required: ["error"], properties: { error: ref("ApiError") } },
        ModelCapabilities: {
          type: "object",
          description: "Only capabilities confirmed by the provider are present.",
          properties: { vision: { type: "boolean" }, reasoning: { type: "boolean" }, tools: { type: "boolean" } },
        },
        ModelPricing: {
          type: "object",
          description: "Per million tokens, as published by the provider.",
          required: ["input", "output"],
          properties: {
            input: { type: "number" },
            output: { type: "number" },
            currency: { type: "string", enum: ["USD", "CNY"], default: "USD" },
            from: { type: "boolean", description: "The lowest of several rates." },
            notes: { type: "array", items: { type: "string" } },
            listed: {
              type: "object",
              required: ["url", "checkedOn"],
              properties: { url: { type: "string", format: "uri" }, checkedOn: { type: "string" } },
            },
          },
        },
        CatalogModel: {
          type: "object",
          required: ["id", "name", "capabilities"],
          properties: {
            id: { type: "string", description: "The id to pass as `model` to POST /api/chat." },
            name: { type: "string" },
            contextWindow: { type: "integer", description: "Tokens." },
            maxOutput: { type: "integer", description: "Tokens." },
            capabilities: ref("ModelCapabilities"),
            pricing: ref("ModelPricing"),
            featured: { type: "boolean" },
          },
        },
        Catalog: {
          type: "object",
          required: ["verifiedOn", "providers"],
          properties: {
            verifiedOn: { type: "string", format: "date", description: "When curated details were last checked." },
            providers: {
              type: "array",
              items: {
                type: "object",
                required: ["id", "name", "description", "keyUrl", "docsUrl", "models"],
                properties: {
                  id: ref("ProviderId"),
                  name: { type: "string" },
                  description: { type: "string" },
                  keyUrl: { type: "string", format: "uri", description: "Where to create an API key." },
                  docsUrl: { type: "string", format: "uri" },
                  models: { type: "array", items: ref("CatalogModel") },
                },
              },
            },
          },
        },
        ModelInfo: {
          allOf: [
            ref("CatalogModel"),
            {
              type: "object",
              required: ["provider", "source"],
              properties: {
                provider: ref("ProviderId"),
                source: { type: "string", enum: ["catalog", "provider"], description: "Where the details came from." },
              },
            },
          ],
        },
        ProviderModels: {
          type: "object",
          required: ["provider", "models", "partial", "error"],
          properties: {
            provider: ref("ProviderId"),
            models: { type: "array", items: ref("ModelInfo") },
            partial: { type: "boolean" },
            error: { oneOf: [ref("ApiError"), { type: "null" }] },
          },
        },
        ProviderConnection: {
          type: "object",
          description: "A saved provider key as clients see it: never the key itself.",
          required: ["provider", "keyHint", "options", "status", "lastVerifiedAt", "lastError", "updatedAt"],
          properties: {
            provider: ref("ProviderId"),
            keyHint: { type: "string", description: "Masked, e.g. sk-••••91A2." },
            options: { type: "object", additionalProperties: { type: "string" } },
            status: { type: "string", enum: ["unverified", "valid", "invalid"] },
            lastVerifiedAt: { type: ["string", "null"], format: "date-time" },
            lastError: { type: ["string", "null"] },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        SaveCredentialRequest: {
          type: "object",
          properties: {
            apiKey: {
              type: "string",
              minLength: 8,
              maxLength: 1000,
              pattern: "^[\\x21-\\x7e]+$",
              description: "The provider API key. Omit to keep the saved key and only change options.",
            },
            options: {
              type: "object",
              additionalProperties: { type: "string", maxLength: 500 },
              description: "Provider-specific options, such as region or plan.",
            },
          },
        },
        Attachment: {
          type: "object",
          description: "A text file attached to a message.",
          required: ["name", "type", "size", "text"],
          properties: {
            name: { type: "string", minLength: 1, maxLength: 200 },
            type: { type: "string", maxLength: 100, description: "MIME type." },
            size: { type: "integer", minimum: 0, maximum: LIMITS.attachmentBytes },
            text: { type: "string", maxLength: LIMITS.attachmentBytes },
          },
        },
        ChatRequest: {
          type: "object",
          required: ["provider", "model", "action"],
          properties: {
            conversationId: { type: ["string", "null"], format: "uuid", description: "Omit to start a new conversation." },
            projectId: { type: ["string", "null"], format: "uuid", description: "Project for a new conversation." },
            provider: ref("ProviderId"),
            model: { ...MODEL_ID, description: "Model id, from GET /api/models or GET /api/catalog." },
            action: {
              type: "string",
              enum: ["send", "regenerate", "edit", "continue"],
              description: "`regenerate`, `edit` and `continue` need `conversationId` and `targetMessageId`.",
            },
            content: { type: "string", maxLength: LIMITS.message, description: "The message text (send, edit)." },
            attachments: { type: "array", maxItems: LIMITS.attachmentCount, items: ref("Attachment") },
            targetMessageId: { type: "string", format: "uuid" },
          },
        },
        ChatMessage: {
          type: "object",
          required: ["id", "role", "content", "status", "createdAt"],
          properties: {
            id: { type: "string", format: "uuid" },
            role: { type: "string", enum: ["user", "assistant"] },
            content: { type: "string" },
            reasoning: { type: "string" },
            attachments: { type: "array", items: ref("Attachment") },
            status: { type: "string", enum: ["complete", "cancelled", "failed", "streaming"] },
            provider: { type: ["string", "null"] },
            model: { type: ["string", "null"] },
            finishReason: { type: ["string", "null"] },
            servedModel: { type: ["string", "null"] },
            error: { oneOf: [ref("ApiError"), { type: "null" }] },
            feedback: { type: ["integer", "null"], enum: [-1, 1, null] },
            seq: { type: ["integer", "null"] },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        ChatStreamEvent: {
          description: "One line of the POST /api/chat stream.",
          oneOf: [
            {
              type: "object",
              required: ["type", "conversationId", "conversationTitle", "createdConversation", "assistantMessageId"],
              properties: {
                type: { const: "start" },
                conversationId: { type: "string", format: "uuid" },
                conversationTitle: { type: "string" },
                createdConversation: { type: "boolean" },
                userMessage: { oneOf: [ref("ChatMessage"), { type: "null" }] },
                assistantMessageId: { type: "string", format: "uuid" },
                removedFromSeq: {
                  type: ["integer", "null"],
                  description:
                    "Messages from this seq on are replaced by an edit or regenerate. They are deleted once the new reply is saved, and kept if it fails.",
                },
              },
            },
            {
              type: "object",
              required: ["type", "delta"],
              properties: { type: { enum: ["text", "reasoning"] }, delta: { type: "string" } },
            },
            {
              type: "object",
              required: ["type", "message"],
              properties: { type: { const: "done" }, message: ref("ChatMessage") },
            },
            {
              type: "object",
              required: ["type", "error"],
              properties: {
                type: { const: "error" },
                error: ref("ApiError"),
                message: { oneOf: [ref("ChatMessage"), { type: "null" }] },
                restored: {
                  type: "boolean",
                  description: "True when an edit or regenerate failed and the conversation was left unchanged.",
                },
              },
            },
          ],
        },
      },
    },
  }
}
