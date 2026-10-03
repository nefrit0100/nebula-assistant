import type { NextConfig } from "next"
import pkg from "./package.json"

const isDev = process.env.NODE_ENV !== "production"
const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : ""

/**
 * Content Security Policy. The browser only talks to this origin and Supabase
 * (auth + RLS-scoped data); provider calls happen on the server. Inline scripts
 * are needed for Next.js hydration; dev mode also needs eval for fast refresh.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // Profile photos come from the identity provider's CDN.
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseOrigin} ${supabaseOrigin.replace("https://", "wss://")}`.trim(),
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ")

/**
 * The HTML file preview (src/app/preview/route.ts) only ever runs inside an iframe
 * sandboxed without allow-same-origin, so it can't reach Nebula's session. It may
 * therefore load anything a generated page needs, but only Nebula may frame it.
 */
const previewCsp = [
  "default-src * data: blob: 'unsafe-inline' 'unsafe-eval'",
  "frame-ancestors 'self'",
  "object-src 'none'",
].join("; ")

const permissionsPolicy = "camera=(), microphone=(), geolocation=(), payment=()"
const hsts = isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        // Everything except the preview page, which gets its own policy below.
        source: "/:path((?!preview$).*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: permissionsPolicy },
          ...hsts,
        ],
      },
      {
        source: "/preview",
        headers: [
          { key: "Content-Security-Policy", value: previewCsp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Permissions-Policy", value: permissionsPolicy },
          ...hsts,
        ],
      },
    ]
  },
}

export default nextConfig
