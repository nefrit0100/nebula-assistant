import { MessageSquareDashed } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function ConversationNotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-mist">
        <MessageSquareDashed className="size-5" aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-xl font-semibold tracking-[-0.01em]">This conversation doesn’t exist.</h1>
      <p className="mt-2 max-w-sm text-md text-fg-muted">It may have been deleted, or the link is incorrect.</p>
      <Button asChild className="mt-6">
        <Link href="/app">Start a new conversation</Link>
      </Button>
    </div>
  )
}
