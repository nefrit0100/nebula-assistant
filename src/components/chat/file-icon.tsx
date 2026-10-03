import { AppWindow, FileCode, FileText } from "lucide-react"

export function FileIcon({ language, className }: { language: string; className?: string }) {
  if (language === "html") return <AppWindow className={className} aria-hidden="true" />
  if (language === "markdown" || language === "mdx" || language === "text") {
    return <FileText className={className} aria-hidden="true" />
  }
  return <FileCode className={className} aria-hidden="true" />
}
