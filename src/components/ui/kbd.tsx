import { cn } from "@/lib/cn"

export function Kbd({
  children,
  tone = "default",
  className,
}: {
  children: React.ReactNode
  tone?: "default" | "inverse"
  className?: string
}) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] px-1 font-sans text-xs font-medium",
        tone === "default" ? "border border-line bg-bg text-fg-subtle" : "bg-fg-inverse/15 text-fg-inverse/80",
        className,
      )}
    >
      {children}
    </kbd>
  )
}
