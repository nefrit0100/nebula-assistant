"use client"

import { useState } from "react"
import { toast } from "sonner"
import { PasswordInput } from "@/components/auth/password-input"
import { describeAuthError } from "@/components/auth/auth-errors"
import { GoogleIcon } from "@/components/auth/google-icon"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogBody, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Field, Input } from "@/components/ui/field"
import { formatDate } from "@/lib/dates"
import { LIMITS } from "@/lib/settings"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { useActions, useWorkspaceState } from "@/lib/workspace/context"
import { SettingsGroup, SettingsRow, SettingsSection } from "./primitives"

export function ProfileSection() {
  const actions = useActions()
  const profile = useWorkspaceState((state) => state.profile)
  const viewer = useWorkspaceState((state) => state.viewer)
  const [name, setName] = useState(profile.displayName ?? "")
  const [saving, setSaving] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)

  const dirty = (profile.displayName ?? "") !== name.trim()
  const hasGoogle = viewer.authProviders.includes("google")
  const hasEmail = viewer.authProviders.includes("email")
  const canUseIdentityPhoto = Boolean(viewer.identityAvatarUrl && viewer.identityAvatarUrl !== profile.avatarUrl)

  async function saveName(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    const ok = await actions.updateProfile({ displayName: name.trim() || null })
    setSaving(false)
    if (ok) toast.success("Name updated")
  }

  return (
    <SettingsSection title="Profile" description="How you appear in Nebula.">
      <div className="flex items-center gap-4">
        <Avatar src={profile.avatarUrl} name={profile.displayName} email={viewer.email} size={64} />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{profile.displayName || viewer.email?.split("@")[0]}</p>
          <p className="truncate text-md text-fg-muted">{viewer.email}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {canUseIdentityPhoto && (
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  if (await actions.updateProfile({ avatarUrl: viewer.identityAvatarUrl })) toast.success("Photo updated")
                }}
              >
                Use Google photo
              </Button>
            )}
            {profile.avatarUrl && (
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  if (await actions.updateProfile({ avatarUrl: null })) toast.success("Photo removed")
                }}
              >
                Remove photo
              </Button>
            )}
          </div>
        </div>
      </div>

      <SettingsGroup title="Display name">
        <form onSubmit={saveName} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="Name" className="flex-1">
            {(props) => (
              <Input
                {...props}
                value={name}
                maxLength={LIMITS.displayName}
                autoComplete="name"
                placeholder="Your name"
                onChange={(event) => setName(event.target.value)}
              />
            )}
          </Field>
          <Button type="submit" variant="secondary" loading={saving} disabled={!dirty}>
            Save
          </Button>
        </form>
      </SettingsGroup>

      <SettingsGroup title="Account">
        <SettingsRow label="Email" description="The address you sign in with.">
          <span className="text-md text-fg-muted">{viewer.email ?? "—"}</span>
        </SettingsRow>
        <SettingsRow label="Sign-in methods">
          <span className="flex flex-wrap gap-2">
            {hasGoogle && (
              <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-line px-2.5 text-sm">
                <GoogleIcon className="size-3.5" />
                Google
              </span>
            )}
            {hasEmail && (
              <span className="inline-flex h-7 items-center rounded-full border border-line px-2.5 text-sm">Email and password</span>
            )}
          </span>
        </SettingsRow>
        {hasEmail && (
          <SettingsRow label="Password" description="Choose a new password for email sign-in.">
            <Button size="sm" variant="secondary" onClick={() => setPasswordOpen(true)}>
              Change password
            </Button>
          </SettingsRow>
        )}
        {profile.createdAt && (
          <SettingsRow label="Member since">
            <span className="text-md text-fg-muted">{formatDate(profile.createdAt)}</span>
          </SettingsRow>
        )}
      </SettingsGroup>

      {passwordOpen && <ChangePasswordDialog onClose={() => setPasswordOpen(false)} />}
    </SettingsSection>
  )
}

function ChangePasswordDialog({ onClose }: { onClose: () => void }) {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    if (password.length < 8) return setError("Use at least 8 characters.")
    if (password !== confirm) return setError("The passwords don't match.")
    setSaving(true)
    try {
      const { error: updateError } = await (await getSupabaseBrowserClient()).auth.updateUser({ password })
      if (updateError) throw updateError
    } catch (caught) {
      return setError(describeAuthError(caught as Error))
    } finally {
      setSaving(false)
    }
    toast.success("Password changed")
    onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent title="Change password">
        <form onSubmit={submit}>
          <DialogBody className="flex flex-col gap-4">
            <Field label="New password" description="At least 8 characters.">
              {(props) => (
                <PasswordInput {...props} autoFocus autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              )}
            </Field>
            <Field label="Confirm new password" error={error}>
              {(props) => <PasswordInput {...props} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />}
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} disabled={!password || !confirm}>
              Change password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
