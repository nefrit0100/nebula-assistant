import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// Teach tailwind-merge the custom tokens so e.g. `text-md` (size) and `text-fg`
// (color) aren't mistaken for each other when classes are merged.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["xs", "sm", "md", "base", "lg", "xl", "2xl", "3xl", "4xl"],
      color: [
        "bg",
        "canvas",
        "surface",
        "mist",
        "mist-strong",
        "fg",
        "fg-muted",
        "fg-subtle",
        "fg-faint",
        "fg-inverse",
        "line",
        "line-strong",
        "line-control",
        "accent",
        "accent-fg",
        "hover",
        "press",
        "danger",
        "danger-soft",
        "danger-fg",
        "success",
        "success-soft",
        "warning",
        "warning-soft",
        "scrim",
        "code",
      ],
      radius: ["xs", "sm", "md", "lg", "xl", "2xl"],
      shadow: ["pop", "raise"],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
