import { NewChat } from "@/components/chat/new-chat"
import { isUuid } from "@/lib/uuid"

export default async function NewChatPage(props: PageProps<"/app">) {
  const searchParams = await props.searchParams
  const projectId = isUuid(searchParams.project) ? searchParams.project : null
  return <NewChat projectId={projectId} />
}
