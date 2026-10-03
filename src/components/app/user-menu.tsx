"use client"

import { ChevronsUpDown, CircleHelp, Code2, KeyRound, LogOut, Settings } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { Avatar } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/menu"
import { Tooltip } from "@/components/ui/tooltip"
import { cn } from "@/lib/cn"
import { publicEnv } from "@/lib/env"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { useWorkspaceState } from "@/lib/workspace/context"

export function useSignOut() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  return {
    pending,
    async signOut() {
      setPending(true)
      try {
        const { error } = await (await getSupabaseBrowserClient()).auth.signOut({ scope: "local" })
        if (error) throw error
      } catch {
        setPending(false)
        toast.error("Couldn't sign out", { description: "Check your connection and try again." })
        return
      }
      router.replace("/")
      router.refresh()
    },
  }
}

export function UserMenu({ compact = false }: { compact?: boolean }) {
  const profile = useWorkspaceState((state) => state.profile)
  const email = useWorkspaceState((state) => state.viewer.email)
  const { signOut } = useSignOut()
  const name = profile.displayName || email?.split("@")[0] || "Account"

  const trigger = (
    <DropdownMenuTrigger
      aria-label="Account menu"
      className={cn(
        "flex items-center gap-2.5 rounded-md text-left outline-none transition-colors hover:bg-hover data-[state=open]:bg-hover",
        compact ? "size-10 justify-center" : "h-12 w-full px-2",
      )}
    >
      <Avatar src={profile.avatarUrl} name={profile.displayName} email={email} size={compact ? 28 : 30} />
      {!compact && (
        <>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-md font-medium text-fg">{name}</span>
            {email && <span className="block truncate text-xs text-fg-subtle">{email}</span>}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
        </>
      )}
    </DropdownMenuTrigger>
  )

  return (
    <DropdownMenu>
      {compact ? (
        <Tooltip label="Account" side="right">
          {trigger}
        </Tooltip>
      ) : (
        trigger
      )}
      <DropdownMenuContent side={compact ? "right" : "top"} align={compact ? "end" : "start"} className="w-[240px]">
        <DropdownMenuItem asChild icon={<Settings />}>
          <Link href="/settings">Settings</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild icon={<KeyRound />}>
          <Link href="/settings/providers">AI providers</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild icon={<CircleHelp />}>
          <Link href="/settings/help">Help</Link>
        </DropdownMenuItem>
        {publicEnv.repoUrl && (
          <DropdownMenuItem asChild icon={<Code2 />}>
            <a href={publicEnv.repoUrl} target="_blank" rel="noopener noreferrer">
              Source code
            </a>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem icon={<LogOut />} onSelect={() => void signOut()}>
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
