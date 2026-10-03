"use client"

import { Command } from "cmdk"
import { CircleHelp, FolderClosed, KeyRound, MessageSquare, Search, Settings, SquarePen } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { Kbd } from "@/components/ui/kbd"
import { Spinner } from "@/components/ui/spinner"
import { formatRelative } from "@/lib/dates"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { useActions, useWorkspaceState } from "@/lib/workspace/context"

type Result = { id: string; title: string; snippet: string | null; lastMessageAt: string }

const NO_RESULTS: Result[] = []

/** Snippets come from raw Markdown; strip the syntax so they read as text. */
function cleanSnippet(text: string): string {
  return text
    .replace(/```[a-z]*|`/gi, "")
    .replace(/\|?\s*:?-{3,}:?\s*\|?/g, " ")
    .replace(/[|#>*_~]+/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
}

/** The palette's contents: loaded on demand (cmdk) by SearchPalette. */
export default function PaletteBody({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const actions = useActions()
  const conversations = useWorkspaceState((state) => state.conversations)
  const [query, setQuery] = useState("")
  // Server results are tagged with the query they answer; stale ones are ignored.
  const [answered, setAnswered] = useState<{ query: string; results: Result[] }>({ query: "", results: [] })
  const trimmed = query.trim()
  const wantsRemote = trimmed.length >= 2
  const remote = wantsRemote && answered.query === trimmed ? answered.results : NO_RESULTS
  const searching = wantsRemote && answered.query !== trimmed

  // Instant title matches from what's already loaded.
  const local = useMemo<Result[]>(() => {
    if (!trimmed) return conversations.slice(0, 6).map((c) => ({ id: c.id, title: c.title, snippet: null, lastMessageAt: c.lastMessageAt }))
    const needle = trimmed.toLowerCase()
    return conversations
      .filter((c) => c.title.toLowerCase().includes(needle))
      .slice(0, 8)
      .map((c) => ({ id: c.id, title: c.title, snippet: null, lastMessageAt: c.lastMessageAt }))
  }, [conversations, trimmed])

  // Full-text search across titles and message content (RLS-scoped).
  useEffect(() => {
    if (!wantsRemote) return
    const handle = setTimeout(async () => {
      const data = await getSupabaseBrowserClient()
        .then((supabase) => supabase.rpc("search_conversations", { search_query: trimmed, max_results: 20 }))
        .then(({ data }) => data)
        // Offline or unavailable: fall back to the title matches already shown.
        .catch(() => null)
      setAnswered({
        query: trimmed,
        results: (data ?? []).map((row) => ({
          id: row.conversation_id,
          title: row.title,
          snippet: row.match_kind === "message" ? row.snippet : null,
          lastMessageAt: row.last_message_at,
        })),
      })
    }, 220)
    return () => clearTimeout(handle)
  }, [trimmed, wantsRemote])

  const results = useMemo(() => {
    const merged = new Map<string, Result>()
    for (const item of local) merged.set(item.id, item)
    for (const item of remote) merged.set(item.id, { ...merged.get(item.id), ...item, snippet: item.snippet ?? merged.get(item.id)?.snippet ?? null })
    return [...merged.values()]
  }, [local, remote])

  const go = (href: string) => {
    onClose()
    router.push(href)
  }

  const commands = [
    { id: "new", label: "New chat", icon: SquarePen, run: () => { actions.startNewChat(); go("/app") } },
    { id: "projects", label: "Projects", icon: FolderClosed, run: () => go("/app/projects") },
    { id: "providers", label: "AI providers", icon: KeyRound, run: () => go("/settings/providers") },
    { id: "settings", label: "Settings", icon: Settings, run: () => go("/settings") },
    { id: "help", label: "Help and shortcuts", icon: CircleHelp, run: () => go("/settings/help") },
  ].filter((command) => !trimmed || command.label.toLowerCase().includes(trimmed.toLowerCase()))

  const itemClass =
    "flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-md text-fg outline-none data-[selected=true]:bg-hover [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-fg-subtle"

  return (
    <Command shouldFilter={false} loop label="Search conversations" className="flex max-h-[min(70dvh,560px)] flex-col">
      <div className="flex items-center gap-3 border-b border-line px-4">
        <Search className="size-[18px] shrink-0 text-fg-subtle" aria-hidden="true" />
        <Command.Input
          autoFocus
          value={query}
          onValueChange={setQuery}
          placeholder="Search conversations…"
          className="h-14 min-w-0 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-fg-subtle"
        />
        {searching ? <Spinner className="text-fg-subtle" label="Searching" /> : <Kbd className="hidden sm:inline-flex">Esc</Kbd>}
      </div>
      <Command.List className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
        {trimmed && !searching && results.length === 0 && commands.length === 0 && (
          <div className="px-3 py-10 text-center">
            <p className="font-medium text-fg">No conversations found.</p>
            <p className="mt-1 text-sm text-fg-muted">Try a different word, or search for something you wrote.</p>
          </div>
        )}
        {results.length > 0 && (
          <Command.Group
            heading={trimmed ? "Conversations" : "Recent"}
            className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-sm [&_[cmdk-group-heading]]:text-fg-subtle"
          >
            {results.map((result) => (
              <Command.Item key={result.id} value={`conversation-${result.id}`} onSelect={() => go(`/app/chat/${result.id}`)} className={itemClass}>
                <MessageSquare aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{result.title}</span>
                  {result.snippet && <span className="mt-0.5 line-clamp-2 text-sm text-fg-muted">{cleanSnippet(result.snippet)}</span>}
                </span>
                <span className="shrink-0 text-sm text-fg-subtle">{formatRelative(result.lastMessageAt)}</span>
              </Command.Item>
            ))}
          </Command.Group>
        )}
        {commands.length > 0 && (
          <Command.Group
            heading="Go to"
            className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-sm [&_[cmdk-group-heading]]:text-fg-subtle"
          >
            {commands.map((command) => (
              <Command.Item key={command.id} value={`command-${command.id}`} onSelect={command.run} className={itemClass}>
                <command.icon aria-hidden="true" />
                {command.label}
              </Command.Item>
            ))}
          </Command.Group>
        )}
      </Command.List>
    </Command>
  )
}
