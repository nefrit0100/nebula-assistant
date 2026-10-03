"use client"

import { useState } from "react"
import { cn } from "@/lib/cn"

export function initialsOf(name: string | null | undefined, email?: string | null): string {
  const source = name?.trim() || email?.split("@")[0] || ""
  const parts = source.split(/[\s._-]+/).filter(Boolean)
  const letters = parts.length >= 2 ? parts[0][0] + parts[1][0] : source.slice(0, 2)
  return letters.toUpperCase() || "?"
}

type AvatarProps = {
  src?: string | null
  name?: string | null
  email?: string | null
  size?: number
  className?: string
}

/** Profile photo with an initials fallback (also used when the image fails to load). */
export function Avatar({ src, name, email, size = 32, className }: AvatarProps) {
  const [failed, setFailed] = useState(false)
  const showImage = src && !failed
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-mist font-semibold text-fg",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.38)) }}
      aria-hidden="true"
    >
      {showImage ? (
        // Plain img: avatars come from the identity provider's CDN; referrer stripped for privacy.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          referrerPolicy="no-referrer"
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        initialsOf(name, email)
      )}
    </span>
  )
}
