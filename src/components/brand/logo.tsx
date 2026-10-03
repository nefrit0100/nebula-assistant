import Image from "next/image"
import mark from "@/assets/brand/nebula-mark.png"
import { cn } from "@/lib/cn"

/**
 * The Nebula mark: a ringed planet and a forming star. The artwork is wider than
 * it is tall, so it sits centred in a square box. Decorative: whatever it sits
 * next to (the wordmark, a label) names it.
 */
export function LogoMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <Image
      src={mark}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      // A 128px file covers every size the UI uses; skip the resizing service.
      unoptimized
      loading="eager"
      draggable={false}
      className={cn("shrink-0 select-none", className)}
    />
  )
}

export function Logo({ className, size = 28, wordmark = true }: { className?: string; size?: number; wordmark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-fg", className)}>
      <LogoMark size={size} />
      {wordmark && (
        <span className="text-[1.0625rem] font-semibold leading-none tracking-[-0.02em]">Nebula</span>
      )}
    </span>
  )
}
