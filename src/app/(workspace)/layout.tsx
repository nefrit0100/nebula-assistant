import type { Metadata } from "next"
import { cookies } from "next/headers"
import { loadWorkspace } from "@/lib/server/workspace"
import { SIDEBAR_COOKIE } from "@/lib/workspace/constants"
import { WorkspaceProvider } from "@/lib/workspace/context"

// Private pages: robots.txt disallows them too, but a shared link must never get indexed.
export const metadata: Metadata = { robots: { index: false, follow: false } }

/**
 * Shared, authenticated data layer for /app and /settings. Loads the workspace
 * once; navigation between the two keeps the client store alive.
 */
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const [snapshot, cookieStore] = await Promise.all([loadWorkspace(), cookies()])
  const collapsed = cookieStore.get(SIDEBAR_COOKIE)?.value === "collapsed"

  return (
    <WorkspaceProvider snapshot={snapshot} sidebarCollapsed={collapsed}>
      {children}
    </WorkspaceProvider>
  )
}
