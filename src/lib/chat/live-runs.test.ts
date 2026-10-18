import assert from "node:assert/strict"
import { test } from "node:test"
import { mergeLiveRun, type LiveRun } from "./live-runs"
import type { ChatMessage } from "./types"

function message(id: string, role: "user" | "assistant", seq: number | null, content = id): ChatMessage {
  return {
    id,
    role,
    content,
    reasoning: "",
    attachments: [],
    status: "complete",
    provider: null,
    model: null,
    finishReason: null,
    servedModel: null,
    error: null,
    feedback: null,
    seq,
    createdAt: "2026-10-18T00:00:00.000Z",
  }
}

function run(overrides: Partial<LiveRun>): LiveRun {
  return {
    conversationId: "c1",
    token: "t1",
    user: null,
    assistant: { ...message("new", "assistant", null, "partial"), status: "streaming" },
    removedFromSeq: null,
    done: false,
    stop: () => {},
    ...overrides,
  }
}

const stored = [message("u1", "user", 1), message("a1", "assistant", 2), message("u2", "user", 3), message("a2", "assistant", 4)]

test("a regenerate in progress hides the reply it replaces", () => {
  const merged = mergeLiveRun(stored, run({ removedFromSeq: 4 }))
  assert.deepEqual(merged.map((m) => m.id), ["u1", "a1", "u2", "new"])
})

test("an edit in progress hides everything from the edited message on, but keeps its new version", () => {
  const edited = message("u2b", "user", 5)
  const merged = mergeLiveRun([...stored, edited], run({ removedFromSeq: 3, user: edited }))
  assert.deepEqual(merged.map((m) => m.id), ["u1", "a1", "u2b", "new"])
})

test("a finished replacement stored after the old messages is kept", () => {
  const reply = message("new", "assistant", 6, "final")
  const merged = mergeLiveRun([...stored, reply], run({ removedFromSeq: 4, assistant: reply, done: true }))
  assert.deepEqual(merged.map((m) => m.id), ["u1", "a1", "u2", "new"])
})

test("a restored turn leaves the transcript as it was", () => {
  assert.equal(mergeLiveRun(stored, run({ removedFromSeq: 2, done: true, restored: true })), stored)
})
