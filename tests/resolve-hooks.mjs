import { existsSync, statSync } from "node:fs"
import { fileURLToPath, pathToFileURL } from "node:url"

const SRC = new URL("../src/", import.meta.url)
const EXTENSIONS = [".ts", ".tsx", "/index.ts", "/index.tsx"]

function isFile(path) {
  return existsSync(path) && statSync(path).isFile()
}

/** Resolves an extensionless source path the way the TypeScript bundler resolution does. */
function withExtension(url) {
  const path = fileURLToPath(url)
  if (isFile(path)) return url
  for (const ext of EXTENSIONS) {
    if (isFile(path + ext)) return pathToFileURL(path + ext).href
  }
  return null
}

export async function resolve(specifier, context, next) {
  if (specifier === "server-only") {
    return { url: "data:text/javascript,export {}", shortCircuit: true }
  }
  if (specifier.startsWith("@/")) {
    const url = withExtension(new URL(specifier.slice(2), SRC).href)
    if (url) return { url, shortCircuit: true }
  }
  const fromSource = context.parentURL?.startsWith("file:") && !context.parentURL.includes("/node_modules/")
  if (fromSource && (specifier.startsWith("./") || specifier.startsWith("../"))) {
    const url = withExtension(new URL(specifier, context.parentURL).href)
    if (url) return { url, shortCircuit: true }
  }
  // Next's entry points are CommonJS files named without an extension in "exports".
  if (/^next\/[a-z-]+$/.test(specifier)) {
    return next(`${specifier}.js`, context)
  }
  return next(specifier, context)
}
