"use client"

import { FolderInput, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { memo, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/menu"
import { cn } from "@/lib/cn"
import { groupConversations } from "@/lib/dates"
import { useActions, useWorkspaceState } from "@/lib/workspace/context"
import type { ConversationSummary } from "@/lib/workspace/types"
import { useConversationDialogs } from "./conversation-dialogs"

export function ConversationList({ onNavigate }: { onNavigate?: () => void }) {
  const conversations = useWorkspaceState((state) => state.conversations)
  const hasMore = useWorkspaceState((state) => state.hasMoreConversations)
  const streamingId = useWorkspaceState((state) => state.streamingConversationId)
  const actions = useActions()
  const pathname = usePathname()
  const dialogs = useConversationDialogs()
  const [loadingMore, setLoadingMore] = useState(false)

  const groups = useMemo(() => groupConversations(conversations), [conversations])

  if (conversations.length === 0) {
    return (
      <div className="mx-2 mt-2 rounded-lg px-3 py-4">
        <p className="text-md font-medium text-fg">No conversations yet.</p>
        <p className="mt-1 text-sm text-fg-muted">Start a conversation and your history will appear here.</p>
      </div>
    )
  }

  return (
    <nav aria-label="Conversations" className="flex flex-col gap-4 pb-4">
      {groups.map((group) => (
        <section key={group.label} aria-labelledby={`group-${group.label}`}>
          <h2 id={`group-${group.label}`} className="px-4 pb-1 text-sm font-medium text-fg-subtle">
            {group.label}
          </h2>
          <ul className="flex flex-col gap-px px-2">
            {group.items.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                active={pathname === `/app/chat/${conversation.id}`}
                streaming={streamingId === conversation.id}
                onNavigate={onNavigate}
                onRename={dialogs.rename}
                onMove={dialogs.move}
                onDelete={dialogs.remove}
              />
            ))}
          </ul>
        </section>
      ))}
      {hasMore && (
        <div className="px-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            loading={loadingMore}
            onClick={async () => {
              setLoadingMore(true)
              await actions.loadMoreConversations()
              setLoadingMore(false)
            }}
          >
            Show older conversations
          </Button>
        </div>
      )}
      {dialogs.dialogs}
    </nav>
  )
}

type ItemProps = {
  conversation: ConversationSummary
  active: boolean
  streaming: boolean
  onNavigate?: () => void
  onRename: (conversation: ConversationSummary) => void
  onMove: (conversation: ConversationSummary) => void
  onDelete: (conversation: ConversationSummary) => void
}

const ConversationItem = memo(function ConversationItem({
  conversation,
  active,
  streaming,
  onNavigate,
  onRename,
  onMove,
  onDelete,
}: ItemProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <li className="group/item relative">
      <Link
        href={`/app/chat/${conversation.id}`}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex h-9 items-center gap-2 rounded-md pl-2.5 pr-9 text-md transition-colors duration-100",
          active ? "bg-mist font-medium text-fg" : "text-fg-muted hover:bg-hover hover:text-fg",
        )}
      >
        <span className="min-w-0 flex-1 truncate">{conversation.title}</span>
        {streaming && (
          <span className="size-1.5 shrink-0 animate-[breathe_1.1s_ease-in-out_infinite] rounded-full bg-accent">
            <span className="sr-only">Generating</span>
          </span>
        )}
      </Link>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger
          aria-label={`Options for ${conversation.title}`}
          className={cn(
            "absolute right-1 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-sm text-fg-subtle transition",
            "hover:bg-press hover:text-fg focus-visible:opacity-100 data-[state=open]:bg-press data-[state=open]:opacity-100",
            "pointer-fine:opacity-0 pointer-fine:group-hover/item:opacity-100",
            active && "pointer-fine:opacity-100",
          )}
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[200px]">
          <DropdownMenuItem icon={<Pencil />} onSelect={() => onRename(conversation)}>
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem icon={<FolderInput />} onSelect={() => onMove(conversation)}>
            Move to project
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem icon={<Trash2 />} tone="danger" onSelect={() => onDelete(conversation)}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  )
})
