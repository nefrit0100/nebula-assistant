"use client"

import { FolderClosed, FolderInput, Menu, MoreHorizontal, Pencil, SquarePen, Trash2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { useConversationDialogs } from "@/components/app/conversation-dialogs"
import { IconButton } from "@/components/ui/icon-button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/menu"
import { useActions, useWorkspaceState } from "@/lib/workspace/context"

export function ChatHeader({ conversationId }: { conversationId: string | null }) {
  const actions = useActions()
  const router = useRouter()
  const conversation = useWorkspaceState((state) =>
    conversationId ? (state.conversations.find((c) => c.id === conversationId) ?? null) : null,
  )
  const project = useWorkspaceState((state) =>
    conversation?.projectId ? (state.projects.find((p) => p.id === conversation.projectId) ?? null) : null,
  )
  const dialogs = useConversationDialogs()

  // Keep the tab title in step with renames and freshly titled new chats.
  const title = conversation?.title
  useEffect(() => {
    if (title) document.title = `${title} – Nebula`
  }, [title])

  return (
    <header className="flex h-14 shrink-0 items-center gap-1 px-2 sm:px-3">
      <IconButton label="Open menu" className="md:hidden" showTooltip={false} onClick={() => actions.setMobileNavOpen(true)}>
        <Menu />
      </IconButton>

      <div className="flex min-w-0 flex-1 items-center gap-2 px-1">
        {project && (
          <>
            <Link
              href={`/app/projects/${project.id}`}
              className="hidden min-w-0 max-w-[30%] items-center gap-1.5 rounded-sm px-1.5 py-1 text-md text-fg-muted hover:bg-hover hover:text-fg sm:flex"
            >
              <FolderClosed className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{project.name}</span>
            </Link>
            <span className="hidden text-fg-faint sm:inline" aria-hidden="true">
              /
            </span>
          </>
        )}
        {conversation && (
          <h1 className="truncate text-md font-medium text-fg" title={conversation.title}>
            {conversation.title}
          </h1>
        )}
      </div>

      {conversation && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton label="Conversation options" showTooltip={false}>
              <MoreHorizontal />
            </IconButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[210px]">
            <DropdownMenuItem icon={<Pencil />} onSelect={() => dialogs.rename(conversation)}>
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem icon={<FolderInput />} onSelect={() => dialogs.move(conversation)}>
              Move to project
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem icon={<Trash2 />} tone="danger" onSelect={() => dialogs.remove(conversation)}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <IconButton
        label="New chat"
        className="md:hidden"
        showTooltip={false}
        onClick={() => {
          actions.startNewChat()
          router.push("/app")
        }}
      >
        <SquarePen />
      </IconButton>
      {dialogs.dialogs}
    </header>
  )
}
