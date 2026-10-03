"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { createStore, type Store, useStoreSelector } from "@/lib/store"
import { createWorkspaceActions, type WorkspaceActions } from "./actions"
import type { WorkspaceSnapshot, WorkspaceState } from "./types"

type Workspace = { store: Store<WorkspaceState>; actions: WorkspaceActions }

const WorkspaceContext = createContext<Workspace | null>(null)

export function WorkspaceProvider({
  snapshot,
  sidebarCollapsed,
  children,
}: {
  snapshot: WorkspaceSnapshot
  sidebarCollapsed: boolean
  children: React.ReactNode
}) {
  const [workspace] = useState<Workspace>(() => {
    const store = createStore<WorkspaceState>({
      ...snapshot,
      models: { status: "idle", providers: [], fetchedAt: null },
      sidebarCollapsed,
      mobileNavOpen: false,
      searchOpen: false,
      newChatNonce: 0,
      streamingConversationId: null,
    })
    return { store, actions: createWorkspaceActions(store) }
  })

  // Keep multiple tabs consistent: refresh the conversation list when this tab
  // regains focus (at most every 30s).
  useEffect(() => {
    let last = Date.now()
    const onVisible = () => {
      if (document.visibilityState !== "visible" || Date.now() - last < 30_000) return
      last = Date.now()
      void workspace.actions.refreshConversations()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [workspace])

  return <WorkspaceContext.Provider value={workspace}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace(): Workspace {
  const workspace = useContext(WorkspaceContext)
  if (!workspace) throw new Error("useWorkspace must be used inside <WorkspaceProvider>")
  return workspace
}

export function useActions(): WorkspaceActions {
  return useWorkspace().actions
}

/** Subscribe to a slice of workspace state. */
export function useWorkspaceState<S>(selector: (state: WorkspaceState) => S, equals?: (a: S, b: S) => boolean): S {
  return useStoreSelector(useWorkspace().store, selector, equals)
}
