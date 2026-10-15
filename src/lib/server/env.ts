import "server-only"

let cachedKey: Uint8Array<ArrayBuffer> | null = null

/** The 256-bit key that encrypts provider credentials at rest. */
export function getEncryptionKey(): Uint8Array<ArrayBuffer> {
  if (cachedKey) return cachedKey
  const raw = process.env.NEBULA_ENCRYPTION_KEY?.trim()
  if (!raw) {
    throw new Error('NEBULA_ENCRYPTION_KEY is not set. See README → "Environment variables".')
  }
  let key: Uint8Array<ArrayBuffer>
  try {
    // Standard or URL-safe alphabet, as Node's Buffer accepted both.
    key = Uint8Array.from(atob(raw.replace(/-/g, "+").replace(/_/g, "/")), (char) => char.charCodeAt(0))
  } catch {
    throw new Error("NEBULA_ENCRYPTION_KEY is not valid base64.")
  }
  if (key.length !== 32) {
    throw new Error(`NEBULA_ENCRYPTION_KEY must be 32 bytes, base64-encoded (got ${key.length} bytes).`)
  }
  cachedKey = key
  return key
}
