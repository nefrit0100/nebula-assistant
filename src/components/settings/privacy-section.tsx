"use client"

import { Download } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogBody, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Field, Input } from "@/components/ui/field"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { useActions, useWorkspaceState } from "@/lib/workspace/context"
import { SettingsGroup, SettingsRow, SettingsSection } from "./primitives"

const PAGE = 1000

/** Fetches every conversation and message the user owns (RLS-scoped) as JSON. */
async function exportConversations() {
  const supabase = await getSupabaseBrowserClient()
  const conversations: unknown[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("conversations")
      .select("id, title, project_id, provider_id, model_id, created_at, last_message_at")
      .order("created_at", { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw error
    conversations.push(...(data ?? []))
    if (!data || data.length < PAGE) break
  }
  const messages: unknown[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("messages")
      .select("conversation_id, role, content, attachments, provider_id, model_id, status, created_at")
      .order("seq", { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw error
    messages.push(...(data ?? []))
    if (!data || data.length < PAGE) break
  }
  const { data: projects } = await supabase.from("projects").select("id, name, description, instructions, created_at")
  return { exportedAt: new Date().toISOString(), projects: projects ?? [], conversations, messages }
}

export function PrivacySection() {
  const router = useRouter()
  const actions = useActions()
  const conversationCount = useWorkspaceState((state) => state.conversations.length)
  const [exporting, setExporting] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [typed, setTyped] = useState("")
  const [deleting, setDeleting] = useState(false)

  async function download() {
    setExporting(true)
    try {
      const data = await exportConversations()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `nebula-export-${new Date().toISOString().slice(0, 10)}.json`
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error("Couldn't export your data", { description: "Check your connection and try again." })
    } finally {
      setExporting(false)
    }
  }

  async function deleteAccount() {
    setDeleting(true)
    try {
      const supabase = await getSupabaseBrowserClient()
      const { error } = await supabase.rpc("delete_own_account")
      if (error) throw error
      // The account is gone server-side; clearing the local session can't fail meaningfully now.
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined)
    } catch {
      setDeleting(false)
      toast.error("Couldn't delete your account", { description: "Try again in a moment." })
      return
    }
    router.replace("/")
    router.refresh()
  }

  return (
    <SettingsSection title="Privacy and data" description="What Nebula keeps, what providers receive, and how to remove it.">
      <SettingsGroup title="What Nebula stores">
        <ul className="flex flex-col gap-2 text-md text-fg-muted">
          <li>Your account email, name and profile photo.</li>
          <li>Your settings, personalization and projects.</li>
          <li>Your conversations and messages, so you can return to them.</li>
          <li>Your provider API keys, encrypted. They are never shown back to you or sent to your browser.</li>
        </ul>
        <p className="mt-3 text-sm text-fg-subtle">
          Data is stored in a Supabase Postgres database with row-level security, so each account can only access its
          own records.
        </p>
      </SettingsGroup>

      <SettingsGroup title="What AI providers receive">
        <p className="text-md text-fg-muted">
          When you send a message, the conversation so far, your personalization, any project instructions and attached
          files are sent to the provider you selected. The provider processes them under its own terms and privacy
          policy, and bills your account for usage.
        </p>
      </SettingsGroup>

      <SettingsGroup title="Your data">
        <SettingsRow label="Export conversations" description="Download every conversation, message and project as a JSON file.">
          <Button size="sm" variant="secondary" loading={exporting} onClick={download}>
            {!exporting && <Download className="size-4" aria-hidden="true" />}
            Export
          </Button>
        </SettingsRow>
        <SettingsRow label="Delete all conversations" description="Permanently removes every conversation and message. Projects and settings stay.">
          <Button size="sm" variant="danger-ghost" onClick={() => setConfirmClear(true)} disabled={conversationCount === 0}>
            Delete all
          </Button>
        </SettingsRow>
        <SettingsRow label="Delete account" description="Permanently deletes your account, keys, conversations and settings.">
          <Button size="sm" variant="danger-ghost" onClick={() => setConfirmDelete(true)}>
            Delete account
          </Button>
        </SettingsRow>
      </SettingsGroup>

      <Dialog open={confirmClear} onOpenChange={setConfirmClear}>
        <DialogContent title="Delete all conversations?" description="Every conversation and message will be permanently deleted. This can't be undone.">
          <DialogFooter className="pt-5">
            <Button variant="secondary" onClick={() => setConfirmClear(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={clearing}
              onClick={async () => {
                setClearing(true)
                const ok = await actions.deleteAllConversations()
                setClearing(false)
                if (ok) {
                  setConfirmClear(false)
                  toast.success("All conversations deleted")
                }
              }}
            >
              Delete all
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete} onOpenChange={(open) => { setConfirmDelete(open); if (!open) setTyped("") }}>
        <DialogContent
          title="Delete your account?"
          description="Your account, saved provider keys, conversations, projects and settings will be permanently deleted. This can't be undone."
        >
          <DialogBody>
            <Field label={<>Type <span className="font-mono">DELETE</span> to confirm</>}>
              {(props) => <Input {...props} autoComplete="off" value={typed} onChange={(event) => setTyped(event.target.value)} />}
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={deleting} disabled={typed !== "DELETE"} onClick={deleteAccount}>
              Delete account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsSection>
  )
}
