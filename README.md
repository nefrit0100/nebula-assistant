# Nebula Assistant

A free, open-source AI assistant where you bring your own API keys. Connect OpenAI, Anthropic, DeepSeek, Alibaba Cloud (Qwen), Zhipu AI (GLM), OpenRouter or OpenCode, and chat with any model your keys can use — in one calm, fast workspace.

- **Bring your own key.** Keys are encrypted with AES-256-GCM before they're stored and are only decrypted on the server to call the provider you choose. Your browser never receives a saved key back.
- **Seven providers, one interface.** A provider abstraction keeps every provider-specific detail inside an adapter; the UI never knows which wire protocol a model speaks.
- **Real persistence.** Conversations, messages, projects and settings live in Supabase Postgres, protected by row-level security.
- **Built for everyone.** Streaming replies, Markdown with syntax-highlighted code and math, edit and regenerate, search, projects, keyboard shortcuts, light and dark themes, and a layout that works from 320 px phones to wide desktops.

## Contents

- [Features](#features)
- [Architecture](#architecture)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Supabase setup](#supabase-setup)
- [Providers](#providers)
- [Deployment](#deployment)
- [Security model](#security-model)
- [Project structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

## Features

| Area | What's included |
| --- | --- |
| Auth | Email and password (with confirmation and password reset), Google OAuth, protected routes, session refresh in `proxy.ts` |
| Chat | Streaming replies, stop, regenerate, continue, edit-and-resend, copy, feedback, reasoning display, text-file attachments |
| Rendering | GitHub-flavored Markdown, tables, KaTeX math (loaded on demand), Shiki code highlighting (loaded per language), line numbers, wrap toggle, copy |
| Files | Long deliverables (whole code files, documents, prompts) arrive as file cards with copy, download and a full viewer; HTML and Markdown files get a live preview. Models are asked to use `<file name="…">` blocks, and long code blocks or bare HTML documents become files even when they don't. Any reply can be downloaded as Markdown |
| Organization | Conversation history grouped by date, rename, delete, move to project, full-text search (`Ctrl/⌘ K`) |
| Projects | Group conversations with shared instructions that are sent with every chat in the project |
| Models | Searchable model picker per provider, live model discovery, capability details with their source |
| BYOK | Connect, test, edit options, replace and remove keys per provider; keys verified at save time without spending tokens |
| Settings | Profile, personalization (name, about you, response style, custom instructions), appearance, chat preferences, privacy (export, delete all, delete account), help |
| Accessibility | Keyboard navigation with skip links, visible focus, labelled icon buttons, accessible dialogs and menus, WCAG AA text contrast and 3:1 form-control borders, reduced-motion support |
| Legal | Privacy Policy, Terms of Service and Cookie Policy pages showing the operator's details, a cookie notice, and Terms/age (16+) consent at sign-up |
| Docs | A public user guide at `/docs` (getting started, providers and keys, features, shortcuts, sign-in help, troubleshooting), also readable in a dialog on the sign-in and sign-up pages without leaving the form |

## Architecture

```
Browser ──► Next.js 16 (App Router)
              ├─ proxy.ts ............ refreshes the Supabase session, guards /app and /settings
              ├─ Server Components ... load workspace data through RLS-scoped Supabase queries
              ├─ /api/chat ........... auth → rate limit → decrypt key → provider adapter → NDJSON stream → persist
              ├─ /api/providers ...... verify → encrypt → store credentials (never returned)
              └─ /api/models ......... live model discovery per connected provider
                       │
                       ▼
            Provider adapters (src/lib/providers/server)
              ├─ openai-chat ......... DeepSeek, Alibaba, Zhipu, OpenRouter, OpenCode (most models)
              ├─ openai-responses .... OpenAI, OpenCode GPT/Grok models
              └─ anthropic-messages .. Anthropic, OpenCode Claude/Qwen/MiniMax models
                       │
                       ▼
            Supabase Postgres (RLS on every table) + Supabase Auth
```

Every adapter implements one interface:

```ts
interface ProviderAdapter {
  id: ProviderId
  verify(ctx: ProviderContext): Promise<void>            // checks a key without spending tokens
  listModels(ctx: ProviderContext): Promise<ModelListing>
  streamChat(ctx: ProviderContext, request: ChatRequest): AsyncIterable<StreamPart>
}
```

`StreamPart` is a small, provider-neutral vocabulary (`text`, `reasoning`, `finish`), and every SDK or HTTP error is normalized into one error vocabulary (`invalid_api_key`, `rate_limited`, `model_not_found`, …) with secrets redacted before anything leaves the server.

## Getting started

Requirements: Node.js 20.9 or later and a Supabase project (the free tier works).

```bash
git clone <your-fork-url> nebula-assistant
cd nebula-assistant
npm install
# create .env.local with the variables listed under "Environment variables" below
npm run dev
```

Open http://localhost:3000, create an account, then go to **Settings → AI providers** and paste a key.

Useful scripts:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint (includes React Compiler-aware hooks rules) |
| `npm run typecheck` | TypeScript, no emit |
| `npm test` | Unit tests with Node's built-in test runner (Node 22.18+ runs the TypeScript directly; no extra dependencies) |

## Environment variables

| Variable | Scope | Required | Description |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Yes | Your project URL, from Supabase → Project Settings → API. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public | Yes | The publishable key (`sb_publishable_…`) or legacy anon key. Safe in the browser because every table enforces RLS. |
| `NEXT_PUBLIC_SITE_URL` | Public | Yes | The deployment's canonical origin, e.g. `https://nebula.example.com`. Used for metadata; an `https://` origin also turns on Secure cookies, HTTPS redirects and `upgrade-insecure-requests`. |
| `NEXT_PUBLIC_REPO_URL` | Public | No | Your public repository URL. Open-source links appear only when this is set. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Public | No | Cloudflare Turnstile site key for bot protection on sign-in, sign-up and password reset. See [Bot protection](#bot-protection). |
| `NEXT_PUBLIC_OPERATOR_NAME` | Public | Before launch | Person or company running this deployment, shown on the Privacy, Terms and Cookies pages and in Settings → About. Until it's set, those pages say the operator hasn't added their details. |
| `NEXT_PUBLIC_OPERATOR_ADDRESS` | Public | Before launch | Postal address, one line. |
| `NEXT_PUBLIC_OPERATOR_EMAIL` | Public | Before launch | Contact address for privacy, data-deletion and legal requests; linked from the legal pages and Settings → Privacy and data. |
| `NEXT_PUBLIC_OPERATOR_REGISTRATION` | Public | No | Company registration and VAT numbers, one line. |
| `NEBULA_ENCRYPTION_KEY` | Server only | Yes | 32 random bytes, base64. Encrypts provider keys at rest. |

Generate an encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

> Never prefix a server secret with `NEXT_PUBLIC_`. Nebula does **not** need the Supabase service-role key: all database access runs as the signed-in user under RLS.
>
> Rotating `NEBULA_ENCRYPTION_KEY` makes previously saved provider keys unreadable; users will be asked to reconnect.

## Supabase setup

1. **Create a project** at [supabase.com](https://supabase.com).
2. **Apply the schema.** Run the files in `supabase/migrations/` in order — paste them into the SQL editor, or with the [Supabase CLI](https://supabase.com/docs/guides/local-development):
   ```bash
   supabase link --project-ref <your-ref>
   supabase db push
   ```
3. **Configure auth URLs** (Authentication → URL Configuration):
   - Site URL: your deployment origin (`http://localhost:3000` for local development).
   - Redirect URLs: add `http://localhost:3000/**` and `https://<your-domain>/**`.
4. **Email.** Email sign-up works out of the box. Supabase's built-in mailer is rate-limited and meant for testing; configure custom SMTP (Authentication → Emails → SMTP) before inviting real users. If your plan offers it, also turn on leaked-password protection (Authentication → Sign In / Providers → Email).
5. **Email templates (recommended).** The default links use the PKCE flow, which must be opened in the same browser where sign-up started. To make links work on any device, switch the templates to the token-hash flow handled by `/auth/confirm`:
   - *Confirm signup:* `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/app`
   - *Reset password:* `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password`
6. **Google sign-in (optional).**
   1. In Google Cloud Console, create an OAuth client (type *Web application*).
   2. Add the authorized redirect URI shown in Supabase → Authentication → Sign In / Providers → Google (it looks like `https://<ref>.supabase.co/auth/v1/callback`).
   3. Paste the client ID and secret into Supabase and enable the provider.

   The "Continue with Google" button appears automatically once the provider is enabled — Nebula reads the project's public auth settings and never shows a sign-in option that won't work.
7. **Rate limits.** Sign-in, sign-up and email requests go straight from the browser to Supabase Auth, which rate-limits them per IP. Review the limits in Authentication → Rate Limits before launch.

### Bot protection

Optional, and recommended for public deployments. Supabase verifies the CAPTCHA token server-side, so it also stops bots that call the auth API directly.

1. Create a widget at [Cloudflare Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile) for your domain.
2. In Supabase → Authentication → Bot and Abuse Protection, enable CAPTCHA protection, choose Turnstile and paste the **secret** key.
3. Set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` to the **site** key and rebuild (the key and the CSP that allows Turnstile are baked in at build time).

Enable both halves together: with only the Supabase setting on, sign-in fails for everyone; with only the site key set, the check isn't enforced.

## Providers

| Provider | Key | Endpoint | Options |
| --- | --- | --- | --- |
| OpenAI | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | Responses API | — |
| Anthropic | [platform.claude.com/settings/keys](https://platform.claude.com/settings/keys) | Messages API | — |
| DeepSeek | [platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys) | Chat Completions | — |
| Alibaba Cloud | [Model Studio console](https://modelstudio.console.alibabacloud.com/) | Chat Completions (compatible mode) | Region: International, US, China, or a workspace endpoint |
| Zhipu AI | [z.ai](https://z.ai/manage-apikey/apikey-list) | Chat Completions | Platform: Z.ai or BigModel |
| OpenRouter | [openrouter.ai/settings/keys](https://openrouter.ai/settings/keys) | Chat Completions | — |
| OpenCode | [opencode.ai/auth](https://opencode.ai/auth) | Per model: Chat Completions, Responses or Messages | Plan: Zen or Go |

**Model lists** come from each provider's `/models` endpoint when you connect a key (OpenRouter and OpenCode publish public catalogs). Capability details shown in the model picker come from either the provider's own API (Anthropic, OpenRouter) or a small curated catalog in `src/lib/providers/catalog.ts`, where every figure cites its source. Models without published details are still selectable; Nebula just doesn't guess their capabilities.

**Prices** in the model picker come from OpenRouter's models API, or for every other provider from its published price list, copied into `src/lib/providers/pricing.ts` with the source URL and the date it was checked (the picker links to the source). They are standard rates per million tokens without caching or batch discounts; where a price rises with prompt length, thinking mode or peak hours, the picker shows the lowest rate as "from" and says when it's higher. Alibaba prices cover the International (Singapore) region, Zhipu BigModel prices are in yuan, and OpenCode Go rates count toward the plan's monthly allowance. Update the file when providers change their prices.

**OpenCode** serves each model family over a specific protocol, and the mapping differs between Zen and Go. The routing table lives in `src/lib/providers/server/adapters/opencode.ts`. Gemini (Google protocol) and SystemOne models are hidden until adapters exist for those protocols.

**Anthropic** requests for Claude Opus 5.5, Opus 5, Fable 5.1 and Sonnet 5.5 enable server-side refusal fallbacks (`fallbacks: "default"`). If a model declines, Anthropic can re-run the request on a fallback model, billed at that model's rates; the reply then shows which model answered in its "More" menu.

### Adding a provider

1. Add its id to `PROVIDER_IDS` in `src/lib/providers/types.ts`.
2. Add display metadata and any options to `src/lib/providers/registry.ts`.
3. Implement `ProviderAdapter` in `src/lib/providers/server/adapters/` — for OpenAI-compatible APIs, `createCompatibleAdapter({ id, baseURL })` is usually all you need.
4. Register it in `src/lib/providers/server/index.ts`.
5. Optionally add verified model metadata to `catalog.ts`.

No database migration is needed.

## Deployment

Nebula is a standard Next.js app and runs anywhere Node.js does.

**Vercel**

1. Import the repository.
2. Add the environment variables above (set `NEXT_PUBLIC_SITE_URL` to your production URL).
3. Deploy, then add the production URL to Supabase's Site URL and redirect URLs.

**Before offering it to others**, set the `NEXT_PUBLIC_OPERATOR_*` variables and review `/privacy`, `/terms` and `/cookies` (in `src/app/`): they describe what the software does, not your jurisdiction's specific requirements. Update `LEGAL_UPDATED` in `src/lib/legal.ts` when you change them. Accounts are limited to people aged 16 and over (`MIN_AGE` in the same file). Nebula sends only transactional account emails through Supabase Auth, so they carry no unsubscribe link; if you add any marketing email, it must include one.

Streaming replies can take minutes on reasoning models; `/api/chat` sets `maxDuration = 300`. On Vercel's Hobby plan the effective limit may be lower.

**Self-hosting**

```bash
npm run build
npm start             # serves on port 3000
```

Put it behind a reverse proxy with response buffering disabled for `/api/chat` (Nebula already sends `X-Accel-Buffering: no` for nginx).

## Security model

- **Identity** is always derived from the verified session (`supabase.auth.getClaims()`), never from a client-supplied id.
- **Row-level security** is enabled on every table with owner-only policies. Child rows reference their parent through composite `(id, user_id)` foreign keys, so a row can't be attached to another user's conversation or project even with forged ids.
- **The anon role** has no table privileges at all.
- **Column-level write grants.** Signed-in users may only write the columns the app itself writes. Ids, ownership, message roles, ordering and timestamps come from defaults, identities and triggers and can't be changed through the Data API, even on one's own rows. (Because the server acts as the user rather than with a service key, fields the server legitimately updates, such as a reply's text on Continue, remain writable by their owner.)
- **Input validation.** API routes validate every body with zod, and the database enforces length and format checks on every user-editable column, including writes the browser makes directly. Attachments must be text: size and count are capped and binary content is refused on both sides.
- **Output escaping.** Markdown is rendered without raw HTML, links get `rel="noopener noreferrer"`, and KaTeX runs untrusted. The only injected HTML is the code highlighter's escaped output. Images in replies render as links rather than loading automatically, so a model (or a prompt injection) can't make the browser send requests, and data in URLs, to arbitrary servers; the CSP only allows remote images from Google's profile-photo CDN.
- **Sessions and transport.** Session cookies are `SameSite=Lax` and, on HTTPS deployments, `Secure`. They can't be `HttpOnly` because the browser client reads the session. HTTPS deployments also redirect plain-HTTP requests, send HSTS and `upgrade-insecure-requests`, and every page sends a CSP, `X-Frame-Options: DENY`, `nosniff`, a referrer policy, a permissions policy and `Cross-Origin-Opener-Policy: same-origin`.
- **Passwords and bot protection.** Supabase Auth hashes passwords (bcrypt) and rate-limits sign-in; [Turnstile](#bot-protection) can be added for CAPTCHA protection.
- **Dependencies.** `npm run audit:prod` audits what ships (currently clean; `overrides` in `package.json` pins the nested KaTeX copies to the patched version), and `.github/dependabot.yml` keeps dependencies updated once the repository is on GitHub. The only advisories are in ESLint's toolchain (`braces`, no patched release yet), which never runs in production.
- **Provider keys** are encrypted in the application with AES-256-GCM. The additional authenticated data binds each ciphertext to its user and provider, so a ciphertext copied elsewhere fails to decrypt. Clients hold no `SELECT` grant on the ciphertext column; the server reads it through a `SECURITY DEFINER` function that only returns the caller's own row.
- **Secrets never leave the server.** Provider error messages are redacted before they reach the browser; keys never appear in URLs, logs or responses.
- **SSRF protection.** Provider endpoints are fixed per provider; the one user-supplied endpoint (Alibaba workspaces) must be an `https://*.aliyuncs.com/compatible-mode/v1` URL.
- **Rate limiting.** Chat, credential and model-listing endpoints use a per-user, database-backed limiter that only accepts the app's own bucket names.
- **Open redirects** are blocked: post-auth `next` parameters must be same-site relative paths.
- **HTML previews are sandboxed.** Generated pages render in `/preview`, framed without `allow-same-origin`, so they run in an opaque origin with no access to Nebula's cookies, storage or DOM. That page alone has a permissive CSP (so a page's CDN assets load) and can only be framed by Nebula; every other route keeps the strict policy and `X-Frame-Options: DENY`.

The schema's RLS policies were verified by attempting cross-user reads, writes, spoofed `user_id`s and foreign project references; all were rejected.

## Project structure

```
src/
  app/
    (workspace)/          authenticated area: /app, /app/chat/[id], /app/projects, /settings
    api/                  chat, providers, models route handlers
    auth/                 OAuth / email callback handlers
    page.tsx              the sign-in gateway at /
  components/
    app/ chat/ settings/ projects/ auth/ ui/   feature and design-system components
  lib/
    providers/            registry, catalog, error vocabulary (client-safe)
    providers/server/     adapters, wire protocols (server-only)
    server/               auth, encryption, credentials, prompt assembly
    supabase/             browser/server clients and generated types
    workspace/            client store and optimistic actions
  proxy.ts                session refresh and route guards
supabase/migrations/      schema, RLS policies and functions
```

## Contributing

Issues and pull requests are welcome. Before opening a PR:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Keep provider-specific logic inside adapters, keep new dependencies justified, and match the existing design tokens in `src/app/globals.css` rather than introducing new colors.

## License

[MIT](./LICENSE). Fonts, icons and other bundled third-party assets are listed in [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).
