import "server-only"

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"
import { getEncryptionKey } from "./env"

const VERSION = "v1"
const ALGORITHM = "aes-256-gcm"

/**
 * Additional authenticated data binds each ciphertext to its owner and provider:
 * a ciphertext copied into another user's row (or another provider slot) fails
 * authentication instead of decrypting.
 */
function aad(userId: string, providerId: string) {
  return Buffer.from(`nebula:credential:${userId}:${providerId}`, "utf8")
}

export function encryptSecret(plaintext: string, userId: string, providerId: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv)
  cipher.setAAD(aad(userId, providerId))
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".")
}

export function decryptSecret(payload: string, userId: string, providerId: string): string {
  const [version, ivPart, tagPart, dataPart] = payload.split(".")
  if (version !== VERSION || !ivPart || !tagPart || !dataPart) {
    throw new Error("Unsupported credential format")
  }
  const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), Buffer.from(ivPart, "base64url"))
  decipher.setAAD(aad(userId, providerId))
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"))
  return Buffer.concat([decipher.update(Buffer.from(dataPart, "base64url")), decipher.final()]).toString("utf8")
}

/** A short, non-reversible label such as "sk-…91A2" for showing which key is saved. */
export function keyHint(secret: string): string {
  const trimmed = secret.trim()
  const last4 = trimmed.slice(-4)
  const prefix = /^[A-Za-z]{2,6}[-_]/.exec(trimmed)?.[0] ?? ""
  return `${prefix}••••${last4}`
}

/** Removes a secret (and anything shaped like an API key) from text before it leaves the server. */
export function redactSecrets(text: string, secret?: string): string {
  let out = text
  if (secret && secret.length >= 6) out = out.split(secret).join("[redacted]")
  return out
    .replace(/\b(sk|pk|rk|key|sess)[-_][A-Za-z0-9_\-]{8,}/gi, "[redacted]")
    .replace(/\b[A-Za-z0-9]{32,}\.[A-Za-z0-9_\-]{8,}\b/g, "[redacted]")
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer [redacted]")
}
