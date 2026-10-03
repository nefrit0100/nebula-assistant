"use client"

import { FolderClosed, Plus } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { PageHeader } from "@/components/app/page-header"
import { Button } from "@/components/ui/button"
import { formatRelative } from "@/lib/dates"
import { useActions, useWorkspaceState } from "@/lib/workspace/context"
import { ProjectFormDialog } from "./project-form-dialog"

export function ProjectsIndex() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const actions = useActions()
  const projects = useWorkspaceState((state) => state.projects)
  const conversations = useWorkspaceState((state) => state.conversations)
  const [creating, setCreating] = useState(searchParams.get("new") === "1")

  // ?new=1 (from "Move to project → New project") opens the dialog once; drop it from
  // the URL right away so closing the dialog never has to navigate.
  useEffect(() => {
    if (searchParams.get("new") === "1") router.replace("/app/projects", { scroll: false })
  }, [searchParams, router])

  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const conversation of conversations) {
      if (conversation.projectId) map.set(conversation.projectId, (map.get(conversation.projectId) ?? 0) + 1)
    }
    return map
  }, [conversations])

  const newButton = (
    <Button size="sm" onClick={() => setCreating(true)}>
      <Plus className="size-4" aria-hidden="true" />
      New project
    </Button>
  )

  return (
    <div className="flex h-full flex-col">
      <PageHeader actions={projects.length > 0 ? <div className="pr-1">{newButton}</div> : null}>
        <h1 className="font-medium">Projects</h1>
      </PageHeader>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[50rem] px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
          {projects.length === 0 ? (
            <div className="mx-auto mt-[8vh] flex max-w-md flex-col items-center text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-mist">
                <FolderClosed className="size-5" aria-hidden="true" />
              </span>
              <h2 className="mt-5 text-xl font-semibold tracking-[-0.01em]">Create your first project.</h2>
              <p className="mt-2 text-md text-fg-muted">
                Projects keep related conversations together and give Nebula shared instructions, like the background
                on a thesis, a codebase or a client.
              </p>
              <div className="mt-6">{newButton}</div>
            </div>
          ) : (
            <>
              <p className="text-md text-fg-muted">
                {projects.length} project{projects.length === 1 ? "" : "s"}
              </p>
              <ul className="mt-3 divide-y divide-line border-y border-line">
                {projects.map((project) => {
                  const count = counts.get(project.id) ?? 0
                  return (
                    <li key={project.id}>
                      <Link
                        href={`/app/projects/${project.id}`}
                        className="group flex items-center gap-4 rounded-md px-2 py-4 transition-colors hover:bg-hover sm:px-3"
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-mist text-fg">
                          <FolderClosed className="size-[18px]" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-fg">{project.name}</span>
                          <span className="mt-0.5 block truncate text-sm text-fg-muted">
                            {project.description || (project.instructions ? "Has custom instructions" : "No description")}
                          </span>
                        </span>
                        <span className="hidden shrink-0 text-right text-sm text-fg-subtle sm:block">
                          <span className="block">
                            {count} conversation{count === 1 ? "" : "s"}
                          </span>
                          <span className="block">Updated {formatRelative(project.updatedAt)}</span>
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>
      </div>
      {creating && (
        <ProjectFormDialog
          open={creating}
          onOpenChange={setCreating}
          onSubmit={async (values) => {
            const project = await actions.createProject(values)
            if (project) router.push(`/app/projects/${project.id}`)
            return Boolean(project)
          }}
        />
      )}
    </div>
  )
}
