/**
 * Test bootstrap for `node --test`. Node runs the TypeScript sources directly
 * (type stripping); this hook adds what Next.js normally provides: the `@/` path
 * alias, extensionless imports, and a no-op `server-only`.
 */
import { register } from "node:module"

process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://testproject.supabase.co"
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= "sb_publishable_test"
process.env.NEXT_PUBLIC_SITE_URL ??= "https://nebula.test"
process.env.NEXT_PUBLIC_REPO_URL ??= "https://github.com/example/nebula-assistant"

register("./resolve-hooks.mjs", import.meta.url)
