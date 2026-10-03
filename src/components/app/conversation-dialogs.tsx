"use client"

import { Check, FolderOpen, Plus } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogBody, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Field, Input } from "@/components/ui/field"
import { cn } from "@/lib/cn"
import { LIMITS } from "@/lib/settings"
import { useActions, useWorkspaceState } from "@/lib/workspace/context"
import type { ConversationSummary } from "@/lib/workspace/types"

type DialogProps = {
  conversation: ConversationSummary | null
  onOpenChange: (open: boolean) => void
}

export function RenameConversationDialog({ conversation, onOpenChange }: DialogProps) {
  const actions = useActions()
  const [title, setTitle] = useState(conversation?.title ?? "")
  const [saving, setSaving] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!conversation || !title.trim()) return
    setSaving(true)
    const ok = await actions.renameConversation(conversation.id, title)
    setSaving(false)
    if (ok) onOpenChange(false)
  }

  return (
    <Dialog open={conversation !== null} onOpenChange={onOpenChange}>
      <DialogContent title="Rename conversation">
        <form onSubmit={onSubmit}>
          <DialogBody>
            <Field label="Name">
              {(props) => (
                <Input
                  {...props}
                  autoFocus
                  value={title}
                  maxLength={LIMITS.conversationTitle}
                  onChange={(event) => setTitle(event.target.value)}
                  onFocus={(event) => event.currentTarget.select()}
                />
              )}
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} disabled={!title.trim()}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function DeleteConversationDialog({ conversation, onOpenChange }: DialogProps) {
  const actions = useActions()
  const router = useRouter()
  const pathname = usePathname()
  const [deleting, setDeleting] = useState(false)

  async function onDelete() {
    if (!conversation) return
    setDeleting(true)
    const wasOpen = pathname === `/app/chat/${conversation.id}`
    const ok = await actions.deleteConversation(conversation.id)
    setDeleting(false)
    if (!ok) return
    onOpenChange(false)
    toast.success("Conversation deleted")
    if (wasOpen) {
      actions.startNewChat()
      router.push("/app")
    }
  }

  return (
    <Dialog open={conversation !== null} onOpenChange={onOpenChange}>
      <DialogContent
        title="Delete this conversation?"
        description={
          <>
            <span className="font-medium text-fg">{conversation?.title}</span> and all of its messages will be
            permanently deleted.
          </>
        }
      >
        <DialogFooter className="pt-5">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onDelete} loading={deleting}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function MoveConversationDialog({ conversation, onOpenChange }: DialogProps) {
  const actions = useActions()
  const projects = useWorkspaceState((state) => state.projects)
  const [selected, setSelected] = useState<string | null>(conversation?.projectId ?? null)
  const [saving, setSaving] = useState(false)

  async function onSave() {
    if (!conversation) return
    setSaving(true)
    const ok = await actions.moveConversation(conversation.id, selected)
    setSaving(false)
    if (!ok) return
    onOpenChange(false)
    const project = projects.find((p) => p.id === selected)
    toast.success(project ? `Moved to ${project.name}` : "Removed from project")
  }

  const options = [{ id: null, name: "No project" }, ...projects.map((project) => ({ id: project.id, name: project.name }))]

  return (
    <Dialog open={conversation !== null} onOpenChange={onOpenChange}>
      <DialogContent title="Move to project" description="Projects keep related conversations and instructions together.">
        <DialogBody className="pt-3">
          {projects.length === 0 ? (
            <div className="rounded-lg border border-dashed border-line-strong px-4 py-6 text-center">
              <FolderOpen className="mx-auto size-5 text-fg-subtle" aria-hidden="true" />
              <p className="mt-2 font-medium">Create your first project.</p>
              <p className="mt-1 text-sm text-fg-muted">Then you can file conversations under it.</p>
              <Button asChild variant="secondary" size="sm" className="mt-4">
                <Link href="/app/projects?new=1" onClick={() => onOpenChange(false)}>
                  <Plus className="size-4" aria-hidden="true" />
                  New project
                </Link>
              </Button>
            </div>
          ) : (
            <div role="radiogroup" aria-label="Project" className="flex max-h-72 flex-col gap-0.5 overflow-y-auto">
              {options.map((option) => {
                const active = option.id === selected
                return (
                  <button
                    key={option.id ?? "none"}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setSelected(option.id)}
                    className={cn(
                      "flex h-10 items-center gap-3 rounded-md px-3 text-left text-md transition-colors",
                      active ? "bg-mist text-fg" : "text-fg hover:bg-hover",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{option.name}</span>
                    {active && <Check className="size-4 text-accent" aria-hidden="true" />}
                  </button>
                )
              })}
            </div>
          )}
        </DialogBody>
        {projects.length > 0 && (
          <DialogFooter>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={onSave} loading={saving} disabled={selected === (conversation?.projectId ?? null)}>
              Move
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** Hosts the three dialogs; children receive openers. Keeps menus free of dialog state. */
export function useConversationDialogs() {
  const [renaming, setRenaming] = useState<ConversationSummary | null>(null)
  const [deleting, setDeleting] = useState<ConversationSummary | null>(null)
  const [moving, setMoving] = useState<ConversationSummary | null>(null)

  const dialogs = (
    <>
      <RenameConversationDialog
        key={`rename-${renaming?.id}`}
        conversation={renaming}
        onOpenChange={(open) => !open && setRenaming(null)}
      />
      <DeleteConversationDialog conversation={deleting} onOpenChange={(open) => !open && setDeleting(null)} />
      <MoveConversationDialog
        key={`move-${moving?.id}`}
        conversation={moving}
        onOpenChange={(open) => !open && setMoving(null)}
      />
    </>
  )

  return { rename: setRenaming, remove: setDeleting, move: setMoving, dialogs }
}
