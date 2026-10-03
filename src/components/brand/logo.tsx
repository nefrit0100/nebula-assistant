import { cn } from "@/lib/cn"

/**
 * The Nebula mark: a disk with a mist "bite" and a single forming star.
 * Built from three circles so it stays crisp from 16px up.
 */
export function LogoMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <circle cx="16" cy="16" r="14" fill="var(--fg)" />
      <circle cx="21.5" cy="10.5" r="8" fill="var(--mist)" />
      <circle cx="21.5" cy="10.5" r="2.4" fill="var(--fg)" />
    </svg>
  )
}

export function Logo({ className, size = 22, wordmark = true }: { className?: string; size?: number; wordmark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-fg", className)}>
      <LogoMark size={size} />
      {wordmark && (
        <span className="text-[1.0625rem] font-semibold leading-none tracking-[-0.02em]">Nebula</span>
      )}
    </span>
  )
}
