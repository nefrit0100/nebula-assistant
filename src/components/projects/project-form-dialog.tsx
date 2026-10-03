"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogBody, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Field, Input, Textarea } from "@/components/ui/field"
import { LIMITS } from "@/lib/settings"
import type { Project } from "@/lib/workspace/types"

type Values = { name: string; description: string; instructions: string }

type ProjectFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  project?: Project | null
  onSubmit: (values: Values) => Promise<boolean>
}

export function ProjectFormDialog({ open, onOpenChange, project, onSubmit }: ProjectFormDialogProps) {
  const [values, setValues] = useState<Values>({
    name: project?.name ?? "",
    description: project?.description ?? "",
    instructions: project?.instructions ?? "",
  })
  const [saving, setSaving] = useState(false)
  const editing = Boolean(project)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!values.name.trim()) return
    setSaving(true)
    const ok = await onSubmit(values)
    setSaving(false)
    if (ok) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="md"
        title={editing ? "Edit project" : "New project"}
        description="Group related conversations and give Nebula shared context for all of them."
      >
        <form onSubmit={submit} className="flex min-h-0 flex-col">
          <DialogBody className="flex flex-col gap-5">
            <Field label="Name">
              {(props) => (
                <Input
                  {...props}
                  autoFocus
                  required
                  maxLength={LIMITS.projectName}
                  placeholder="e.g. Thesis research"
                  value={values.name}
                  onChange={(event) => setValues((v) => ({ ...v, name: event.target.value }))}
                />
              )}
            </Field>
            <Field label="Description" description="Optional. A short note for yourself.">
              {(props) => (
                <Input
                  {...props}
                  maxLength={LIMITS.projectDescription}
                  value={values.description}
                  onChange={(event) => setValues((v) => ({ ...v, description: event.target.value }))}
                />
              )}
            </Field>
            <Field
              label="Instructions"
              description="Nebula follows these in every conversation in this project."
              counter={{ value: values.instructions.length, max: LIMITS.projectInstructions }}
            >
              {(props) => (
                <Textarea
                  {...props}
                  rows={5}
                  maxLength={LIMITS.projectInstructions}
                  placeholder="e.g. I'm writing a thesis on urban heat islands. Cite sources and keep a formal tone."
                  value={values.instructions}
                  onChange={(event) => setValues((v) => ({ ...v, instructions: event.target.value }))}
                />
              )}
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} disabled={!values.name.trim()}>
              {editing ? "Save changes" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
