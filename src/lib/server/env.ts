import "server-only"

let cachedKey: Buffer | null = null

/** The 256-bit key that encrypts provider credentials at rest. */
export function getEncryptionKey(): Buffer {
  if (cachedKey) return cachedKey
  const raw = process.env.NEBULA_ENCRYPTION_KEY
  if (!raw) {
    throw new Error("NEBULA_ENCRYPTION_KEY is not set. See .env.example.")
  }
  const key = Buffer.from(raw, "base64")
  if (key.length !== 32) {
    throw new Error("NEBULA_ENCRYPTION_KEY must be 32 bytes, base64-encoded.")
  }
  cachedKey = key
  return key
}
