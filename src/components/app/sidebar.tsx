"use client"

import * as DialogPrimitive from "@radix-ui/react-dialog"
import { FolderClosed, PanelLeft, PanelLeftClose, Search, SquarePen } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Logo, LogoMark } from "@/components/brand/logo"
import { IconButton } from "@/components/ui/icon-button"
import { Kbd } from "@/components/ui/kbd"
import { cn } from "@/lib/cn"
import { useModKey } from "@/lib/hooks"
import { useActions, useWorkspaceState } from "@/lib/workspace/context"
import { ConversationList } from "./conversation-list"
import { UserMenu } from "./user-menu"

function useNewChat() {
  const router = useRouter()
  const actions = useActions()
  return () => {
    actions.startNewChat()
    router.push("/app")
  }
}

/** Full sidebar contents, shared by the desktop column and the mobile drawer. */
function SidebarPanel({ variant }: { variant: "desktop" | "drawer" }) {
  const actions = useActions()
  const newChat = useNewChat()
  const pathname = usePathname()
  const mod = useModKey()
  const closeDrawer = variant === "drawer" ? () => actions.setMobileNavOpen(false) : undefined

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center justify-between pl-4 pr-2">
        <Link href="/app" onClick={() => { actions.startNewChat(); closeDrawer?.() }} className="rounded-sm" aria-label="Nebula, new chat">
          <Logo />
        </Link>
        {variant === "desktop" ? (
          <IconButton label="Collapse sidebar" shortcut={[mod, "⇧", "S"]} tooltipSide="right" onClick={() => actions.setSidebarCollapsed(true)}>
            <PanelLeftClose />
          </IconButton>
        ) : (
          <DialogPrimitive.Close asChild>
            <IconButton label="Close menu" showTooltip={false}>
              <PanelLeftClose />
            </IconButton>
          </DialogPrimitive.Close>
        )}
      </div>

      <div className="flex flex-col gap-px px-2 pb-3">
        <SidebarAction
          icon={<SquarePen />}
          label="New chat"
          hint={[mod, "⇧", "O"]}
          onClick={() => {
            newChat()
            closeDrawer?.()
          }}
        />
        <SidebarAction
          icon={<Search />}
          label="Search"
          hint={[mod, "K"]}
          onClick={() => {
            closeDrawer?.()
            actions.setSearchOpen(true)
          }}
        />
        <SidebarAction
          icon={<FolderClosed />}
          label="Projects"
          href="/app/projects"
          active={pathname.startsWith("/app/projects")}
          onClick={closeDrawer}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pt-1">
        <ConversationList onNavigate={closeDrawer} />
      </div>

      <div className="shrink-0 border-t border-line p-2">
        <UserMenu />
      </div>
    </div>
  )
}

type ActionProps = {
  icon: React.ReactNode
  label: string
  hint?: string[]
  href?: string
  active?: boolean
  onClick?: () => void
}

function SidebarAction({ icon, label, hint, href, active, onClick }: ActionProps) {
  const className = cn(
    "group flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-md transition-colors [&>svg]:size-[18px] [&>svg]:shrink-0",
    active ? "bg-mist font-medium text-fg [&>svg]:text-fg" : "text-fg hover:bg-hover [&>svg]:text-fg-muted",
  )
  const content = (
    <>
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {hint && (
        <span className="hidden gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 pointer-fine:flex" aria-hidden="true">
          {hint.map((key) => (
            <Kbd key={key}>{key}</Kbd>
          ))}
        </span>
      )}
    </>
  )
  return href ? (
    <Link href={href} onClick={onClick} className={className} aria-current={active ? "page" : undefined}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  )
}

/** Icon rail: tablets always, desktops when the sidebar is collapsed. */
function SidebarRail({ onExpand }: { onExpand: () => void }) {
  const actions = useActions()
  const newChat = useNewChat()
  const pathname = usePathname()
  const mod = useModKey()
  return (
    <div className="flex h-full w-[60px] flex-col items-center gap-1 py-2.5">
      <IconButton label="Expand sidebar" tooltipSide="right" onClick={onExpand} className="group mb-2 size-10">
        <span className="group-hover:hidden">
          <LogoMark size={22} />
        </span>
        <PanelLeft className="hidden group-hover:block" />
      </IconButton>
      <IconButton label="New chat" shortcut={[mod, "⇧", "O"]} tooltipSide="right" onClick={newChat} className="size-10">
        <SquarePen />
      </IconButton>
      <IconButton label="Search" shortcut={[mod, "K"]} tooltipSide="right" onClick={() => actions.setSearchOpen(true)} className="size-10">
        <Search />
      </IconButton>
      <Link
        href="/app/projects"
        aria-label="Projects"
        className={cn(
          "inline-flex size-10 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-hover hover:text-fg [&_svg]:size-[18px]",
          pathname.startsWith("/app/projects") && "bg-mist text-fg",
        )}
      >
        <FolderClosed />
      </Link>
      <div className="mt-auto">
        <UserMenu compact />
      </div>
    </div>
  )
}

export function Sidebar() {
  const collapsed = useWorkspaceState((state) => state.sidebarCollapsed)
  const mobileOpen = useWorkspaceState((state) => state.mobileNavOpen)
  const actions = useActions()

  return (
    <>
      {/* Tablet: rail only; expanding opens the drawer. */}
      <aside aria-label="Sidebar" className="hidden shrink-0 border-r border-line bg-canvas md:flex lg:hidden">
        <SidebarRail onExpand={() => actions.setMobileNavOpen(true)} />
      </aside>

      {/* Desktop: full sidebar or rail, by preference. */}
      <aside
        aria-label="Sidebar"
        className={cn(
          "hidden shrink-0 overflow-hidden border-r border-line bg-canvas transition-[width] duration-200 ease-soft lg:flex",
          collapsed ? "w-[60px]" : "w-[272px]",
        )}
      >
        {collapsed ? (
          <SidebarRail onExpand={() => actions.setSidebarCollapsed(false)} />
        ) : (
          <div className="w-[272px]">
            <SidebarPanel variant="desktop" />
          </div>
        )}
      </aside>

      {/* Phones and tablets: drawer. */}
      <DialogPrimitive.Root open={mobileOpen} onOpenChange={actions.setMobileNavOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-scrim data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in lg:hidden" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className="fixed inset-y-0 left-0 z-50 w-[min(86vw,320px)] bg-canvas pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] shadow-pop focus:outline-none data-[state=closed]:animate-drawer-out data-[state=open]:animate-drawer-in lg:hidden"
          >
            <DialogPrimitive.Title className="sr-only">Navigation</DialogPrimitive.Title>
            <SidebarPanel variant="drawer" />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  )
}
