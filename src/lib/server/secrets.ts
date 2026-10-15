import "server-only"

import { getEncryptionKey } from "./env"

const VERSION = "v1"
const TAG_BYTES = 16

/*
 * AES-256-GCM through Web Crypto rather than node:crypto: Cloudflare Workers
 * only emulates parts of node:crypto, and creating a cipher there failed, while
 * Web Crypto is native everywhere Nebula runs. The stored format is unchanged
 * ("v1.<iv>.<tag>.<ciphertext>", base64url), so either implementation reads the other's.
 */

let keyPromise: Promise<CryptoKey> | null = null
function cryptoKey(): Promise<CryptoKey> {
  keyPromise ??= crypto.subtle.importKey("raw", getEncryptionKey(), "AES-GCM", false, ["encrypt", "decrypt"]).catch(
    (error: unknown) => {
      keyPromise = null
      throw error
    },
  )
  return keyPromise
}

/**
 * Additional authenticated data binds each ciphertext to its owner and provider:
 * a ciphertext copied into another user's row (or another provider slot) fails
 * authentication instead of decrypting.
 */
function aad(userId: string, providerId: string) {
  return new TextEncoder().encode(`nebula:credential:${userId}:${providerId}`)
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(text.replace(/-/g, "+").replace(/_/g, "/")), (char) => char.charCodeAt(0))
}

export async function encryptSecret(plaintext: string, userId: string, providerId: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const sealed = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv, additionalData: aad(userId, providerId), tagLength: TAG_BYTES * 8 },
      await cryptoKey(),
      new TextEncoder().encode(plaintext),
    ),
  )
  // Web Crypto appends the tag to the ciphertext; the stored format keeps it separate.
  const ciphertext = sealed.subarray(0, sealed.length - TAG_BYTES)
  const tag = sealed.subarray(sealed.length - TAG_BYTES)
  return [VERSION, toBase64Url(iv), toBase64Url(tag), toBase64Url(ciphertext)].join(".")
}

export async function decryptSecret(payload: string, userId: string, providerId: string): Promise<string> {
  const [version, ivPart, tagPart, dataPart] = payload.split(".")
  if (version !== VERSION || !ivPart || !tagPart || !dataPart) {
    throw new Error("Unsupported credential format")
  }
  const ciphertext = fromBase64Url(dataPart)
  const tag = fromBase64Url(tagPart)
  const sealed = new Uint8Array(ciphertext.length + tag.length)
  sealed.set(ciphertext)
  sealed.set(tag, ciphertext.length)
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64Url(ivPart), additionalData: aad(userId, providerId), tagLength: TAG_BYTES * 8 },
    await cryptoKey(),
    sealed,
  )
  return new TextDecoder().decode(plaintext)
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
