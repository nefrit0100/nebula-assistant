import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ProjectDetail } from "@/components/projects/project-detail"
import { isUuid } from "@/lib/uuid"

export const metadata: Metadata = { title: "Project" }

export default async function ProjectPage(props: PageProps<"/app/projects/[id]">) {
  const { id } = await props.params
  if (!isUuid(id)) notFound()
  return <ProjectDetail key={id} projectId={id} />
}
