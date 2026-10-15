import assert from "node:assert/strict"
import { test } from "node:test"

process.env.NEBULA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64")
const { decryptSecret, encryptSecret, keyHint } = await import("./secrets")

const USER = "00000000-0000-4000-8000-000000000001"

test("reads credentials written by the earlier node:crypto implementation", async () => {
  // Produced by createCipheriv("aes-256-gcm") with the same key, user and provider.
  const stored = "v1.I6kUzCwSiiGfEuBq.UaWkm_-23vGCNiY-ZKf3kg.SWWwaKhhdg-W8igP0yTc6j21ljacMw"
  assert.equal(await decryptSecret(stored, USER, "openrouter"), "sk-or-v1-test-key-1234")
})

test("round-trips, with a fresh IV each time", async () => {
  const a = await encryptSecret("sk-secret-value", USER, "openai")
  const b = await encryptSecret("sk-secret-value", USER, "openai")
  assert.match(a, /^v1\.[\w-]{16}\.[\w-]{22}\.[\w-]+$/)
  assert.notEqual(a, b)
  assert.equal(await decryptSecret(a, USER, "openai"), "sk-secret-value")
})

test("a ciphertext only opens for its own user and provider", async () => {
  const stored = await encryptSecret("sk-secret-value", USER, "openai")
  await assert.rejects(decryptSecret(stored, "00000000-0000-4000-8000-000000000002", "openai"))
  await assert.rejects(decryptSecret(stored, USER, "anthropic"))
})

test("rejects malformed payloads", async () => {
  await assert.rejects(decryptSecret("v2.a.b.c", USER, "openai"), /Unsupported credential format/)
  await assert.rejects(decryptSecret("v1.only-two", USER, "openai"), /Unsupported credential format/)
})

test("key hints never reveal more than the prefix and last four characters", () => {
  assert.equal(keyHint("sk-proj-abcdef1234"), "sk-••••1234")
  assert.equal(keyHint("abcdef1234"), "••••1234")
})
