"use client"

import * as Menu from "@radix-ui/react-dropdown-menu"
import { Slottable } from "@radix-ui/react-slot"
import { Check } from "lucide-react"
import { cn } from "@/lib/cn"

export const DropdownMenu = Menu.Root
export const DropdownMenuTrigger = Menu.Trigger
export const DropdownMenuGroup = Menu.Group

export function DropdownMenuContent({
  className,
  sideOffset = 6,
  align = "start",
  ...props
}: React.ComponentProps<typeof Menu.Content>) {
  return (
    <Menu.Portal>
      <Menu.Content
        sideOffset={sideOffset}
        align={align}
        collisionPadding={12}
        className={cn(
          "z-50 min-w-[200px] overflow-hidden rounded-lg border border-line bg-surface p-1 shadow-pop",
          "origin-(--radix-dropdown-menu-content-transform-origin) data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in",
          className,
        )}
        {...props}
      />
    </Menu.Portal>
  )
}

type ItemProps = React.ComponentProps<typeof Menu.Item> & {
  icon?: React.ReactNode
  shortcut?: string
  tone?: "default" | "danger"
}

export function DropdownMenuItem({ className, icon, shortcut, tone = "default", asChild, children, ...props }: ItemProps) {
  return (
    <Menu.Item
      asChild={asChild}
      className={cn(
        "relative flex h-9 select-none items-center gap-2.5 rounded-sm px-2.5 text-md outline-none transition-colors",
        "data-disabled:pointer-events-none data-disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0",
        tone === "danger"
          ? "text-danger data-highlighted:bg-danger-soft"
          : "text-fg data-highlighted:bg-hover [&_svg]:text-fg-muted",
        className,
      )}
      {...props}
    >
      {icon}
      {/* With asChild, the child element (e.g. a Link) becomes the item and keeps the icon. */}
      {asChild ? <Slottable>{children}</Slottable> : <span className="min-w-0 flex-1 truncate">{children}</span>}
      {shortcut && <span className="ml-auto text-sm text-fg-subtle">{shortcut}</span>}
    </Menu.Item>
  )
}

export function DropdownMenuCheckItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Menu.CheckboxItem>) {
  return (
    <Menu.CheckboxItem
      className={cn(
        "relative flex h-9 select-none items-center gap-2.5 rounded-sm pl-2.5 pr-8 text-md text-fg outline-none data-highlighted:bg-hover",
        className,
      )}
      {...props}
    >
      {children}
      <Menu.ItemIndicator className="absolute right-2.5">
        <Check className="size-4 text-accent" />
      </Menu.ItemIndicator>
    </Menu.CheckboxItem>
  )
}

export function DropdownMenuSeparator({ className }: { className?: string }) {
  return <Menu.Separator className={cn("-mx-1 my-1 h-px bg-line", className)} />
}

export function DropdownMenuLabel({ className, ...props }: React.ComponentProps<typeof Menu.Label>) {
  return <Menu.Label className={cn("px-2.5 pb-1 pt-2 text-sm text-fg-subtle", className)} {...props} />
}
