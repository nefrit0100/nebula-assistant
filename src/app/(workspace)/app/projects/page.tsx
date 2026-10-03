import type { Metadata } from "next"
import { Suspense } from "react"
import { ProjectsIndex } from "@/components/projects/projects-index"

export const metadata: Metadata = { title: "Projects" }

export default function ProjectsPage() {
  return (
    <Suspense>
      <ProjectsIndex />
    </Suspense>
  )
}
