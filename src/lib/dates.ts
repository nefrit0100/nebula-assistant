import type { ConversationSummary } from "./workspace/types"

export type ConversationGroup = { label: string; items: ConversationSummary[] }

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

/** Groups conversations into Today / Yesterday / Previous 7 days / Previous 30 days / Older. */
export function groupConversations(conversations: ConversationSummary[], now = new Date()): ConversationGroup[] {
  const today = startOfDay(now)
  const day = 86_400_000
  const buckets: ConversationGroup[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Previous 7 days", items: [] },
    { label: "Previous 30 days", items: [] },
    { label: "Older", items: [] },
  ]
  for (const conversation of conversations) {
    const time = startOfDay(new Date(conversation.lastMessageAt))
    const index = time >= today ? 0 : time >= today - day ? 1 : time >= today - 7 * day ? 2 : time >= today - 30 * day ? 3 : 4
    buckets[index].items.push(conversation)
  }
  return buckets.filter((bucket) => bucket.items.length > 0)
}

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" })

export function formatRelative(iso: string, now = Date.now()): string {
  const diff = new Date(iso).getTime() - now
  const minutes = Math.round(diff / 60_000)
  if (Math.abs(minutes) < 1) return "just now"
  if (Math.abs(minutes) < 60) return relative.format(minutes, "minute")
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return relative.format(hours, "hour")
  const days = Math.round(hours / 24)
  if (Math.abs(days) < 30) return relative.format(days, "day")
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
}

export function formatTokens(value: number | undefined): string | null {
  if (!value) return null
  if (value >= 1_000_000) return `${Number((value / 1_000_000).toFixed(value % 1_000_000 ? 2 : 0))}M`
  if (value >= 1000) return `${Math.round(value / 1000)}K`
  return String(value)
}
