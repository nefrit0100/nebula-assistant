import { Slot } from "@radix-ui/react-slot"
import { forwardRef } from "react"
import { cn } from "@/lib/cn"
import { Spinner } from "./spinner"

const VARIANTS = {
  primary: "bg-fg text-fg-inverse hover:bg-fg/88 active:bg-fg/80 disabled:bg-press disabled:text-fg-subtle disabled:opacity-100",
  secondary: "bg-bg text-fg border border-line-strong hover:bg-hover active:bg-press",
  ghost: "text-fg-muted hover:text-fg hover:bg-hover active:bg-press",
  mist: "bg-mist text-fg hover:bg-mist-strong",
  danger: "bg-danger text-danger-fg hover:bg-danger/90 active:bg-danger/85",
  "danger-ghost": "text-danger hover:bg-danger-soft",
} as const

const SIZES = {
  sm: "h-8 gap-1.5 rounded-sm px-3 text-sm",
  md: "h-10 gap-2 rounded-md px-4 text-md",
  lg: "h-12 gap-2.5 rounded-lg px-5 text-base",
} as const

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANTS
  size?: keyof typeof SIZES
  loading?: boolean
  asChild?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, asChild = false, className, children, disabled, ...props },
  ref,
) {
  const Component = asChild ? Slot : "button"
  return (
    <Component
      ref={ref}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-medium",
        "transition-[background-color,color,box-shadow,opacity] duration-150 ease-soft",
        "disabled:pointer-events-none disabled:opacity-45",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading && <Spinner className="size-4" />}
          {children}
        </>
      )}
    </Component>
  )
})
