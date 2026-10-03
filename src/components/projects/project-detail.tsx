"use client"

import { FolderX, MessageSquare, MoreHorizontal, Pencil, SquarePen, Trash2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/app/page-header"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { IconButton } from "@/components/ui/icon-button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/menu"
import { formatRelative } from "@/lib/dates"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { CONVERSATION_COLUMNS, toConversationSummary } from "@/lib/workspace/mappers"
import { useActions, useWorkspaceState } from "@/lib/workspace/context"
import type { ConversationSummary } from "@/lib/workspace/types"
import { ProjectFormDialog } from "./project-form-dialog"

export function ProjectDetail({ projectId }: { projectId: string }) {
  const router = useRouter()
  const actions = useActions()
  const project = useWorkspaceState((state) => state.projects.find((p) => p.id === projectId) ?? null)
  const known = useWorkspaceState((state) => state.conversations)
  const [remote, setRemote] = useState<ConversationSummary[] | null>(null)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // The sidebar only holds recent conversations; fetch this project's full list.
  useEffect(() => {
    let cancelled = false
    getSupabaseBrowserClient()
      .then((supabase) =>
        supabase
          .from("conversations")
          .select(CONVERSATION_COLUMNS)
          .eq("project_id", projectId)
          .order("last_message_at", { ascending: false })
          .limit(200),
      )
      .then(({ data }) => data)
      // Unavailable: show the conversations already in the workspace.
      .catch(() => null)
      .then((data) => {
        if (!cancelled) setRemote((data ?? []).map(toConversationSummary))
      })
    return () => {
      cancelled = true
    }
  }, [projectId])

  // Merge with live store state so renames, moves and new chats show immediately.
  const conversations = useMemo(() => {
    const map = new Map<string, ConversationSummary>()
    for (const c of remote ?? []) map.set(c.id, c)
    for (const c of known) {
      if (c.projectId === projectId) map.set(c.id, c)
      else map.delete(c.id)
    }
    return [...map.values()].sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))
  }, [remote, known, projectId])

  if (!project) {
    return (
      <div className="flex h-full flex-col">
        <PageHeader>
          <Link href="/app/projects" className="text-fg-muted hover:text-fg">
            Projects
          </Link>
        </PageHeader>
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-mist">
            <FolderX className="size-5" aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-xl font-semibold">This project doesn’t exist.</h1>
          <p className="mt-2 text-md text-fg-muted">It may have been deleted.</p>
          <Button asChild variant="secondary" className="mt-6">
            <Link href="/app/projects">All projects</Link>
          </Button>
        </div>
      </div>
    )
  }

  function newChat() {
    actions.startNewChat()
    router.push(`/app?project=${projectId}`)
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton label="Project options" showTooltip={false}>
                <MoreHorizontal />
              </IconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem icon={<Pencil />} onSelect={() => setEditing(true)}>
                Edit project
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem icon={<Trash2 />} tone="danger" onSelect={() => setConfirmDelete(true)}>
                Delete project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      >
        <Link href="/app/projects" className="shrink-0 rounded-xs text-fg-muted hover:text-fg">
          Projects
        </Link>
        <span className="text-fg-faint" aria-hidden="true">
          /
        </span>
        <span className="truncate font-medium">{project.name}</span>
      </PageHeader>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[50rem] px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
          <h1 className="text-3xl font-medium tracking-[-0.025em]">{project.name}</h1>
          {project.description && <p className="mt-2 text-lg text-fg-muted">{project.description}</p>}

          <div className="mt-6 flex flex-wrap gap-2">
            <Button onClick={newChat}>
              <SquarePen className="size-4" aria-hidden="true" />
              New chat in project
            </Button>
            <Button variant="secondary" onClick={() => setEditing(true)}>
              <Pencil className="size-4" aria-hidden="true" />
              Edit
            </Button>
          </div>

          <section aria-labelledby="instructions-heading" className="mt-10">
            <h2 id="instructions-heading" className="text-md font-medium text-fg">
              Instructions
            </h2>
            {project.instructions ? (
              <p className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg bg-canvas px-4 py-3 text-md leading-relaxed text-fg-muted">
                {project.instructions}
              </p>
            ) : (
              <p className="mt-2 text-md text-fg-muted">
                No instructions yet.{" "}
                <button type="button" onClick={() => setEditing(true)} className="rounded-xs font-medium text-fg underline decoration-line-strong underline-offset-4 hover:decoration-fg">
                  Add instructions
                </button>{" "}
                to give Nebula shared context for every chat here.
              </p>
            )}
          </section>

          <section aria-labelledby="conversations-heading" className="mt-10">
            <h2 id="conversations-heading" className="text-md font-medium text-fg">
              Conversations
            </h2>
            {remote === null && conversations.length === 0 ? (
              <div className="mt-3 flex flex-col gap-2" role="status" aria-label="Loading conversations">
                {[0, 1, 2].map((index) => (
                  <div key={index} className="skeleton h-12" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <p className="mt-2 text-md text-fg-muted">No conversations in this project yet. Start one above.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line border-y border-line">
                {conversations.map((conversation) => (
                  <li key={conversation.id}>
                    <Link
                      href={`/app/chat/${conversation.id}`}
                      className="flex items-center gap-3 rounded-md px-2 py-3 transition-colors hover:bg-hover sm:px-3"
                    >
                      <MessageSquare className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate">{conversation.title}</span>
                      <span className="shrink-0 text-sm text-fg-subtle">{formatRelative(conversation.lastMessageAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {editing && (
        <ProjectFormDialog
          open={editing}
          onOpenChange={setEditing}
          project={project}
          onSubmit={(values) =>
            actions.updateProject(project.id, {
              name: values.name.trim(),
              description: values.description.trim(),
              instructions: values.instructions.trim(),
            })
          }
        />
      )}

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent
          title="Delete this project?"
          description={
            <>
              <span className="font-medium text-fg">{project.name}</span> and its instructions will be deleted. Its
              conversations are kept and moved out of the project.
            </>
          }
        >
          <DialogFooter className="pt-5">
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={deleting}
              onClick={async () => {
                setDeleting(true)
                const ok = await actions.deleteProject(project.id)
                setDeleting(false)
                if (ok) {
                  toast.success("Project deleted")
                  router.push("/app/projects")
                }
              }}
            >
              Delete project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
