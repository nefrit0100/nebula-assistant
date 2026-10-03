"use client"

import { forwardRef, useId } from "react"
import { cn } from "@/lib/cn"

const control =
  "w-full rounded-md border border-line-strong bg-bg px-3 text-md text-fg transition-[border-color,box-shadow] duration-150 " +
  "hover:border-fg-faint focus:border-accent focus:outline-none focus:ring-[3px] focus:ring-accent/15 " +
  "disabled:cursor-not-allowed disabled:opacity-55 aria-invalid:border-danger aria-invalid:focus:ring-danger/15"

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(control, "h-10", className)} {...props} />
})

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(control, "min-h-24 resize-y py-2.5 leading-relaxed", className)} {...props} />
  },
)

type FieldProps = {
  label: React.ReactNode
  description?: React.ReactNode
  error?: string | null
  counter?: { value: number; max: number }
  children: (props: { id: string; "aria-describedby"?: string; "aria-invalid"?: true }) => React.ReactNode
  className?: string
}

/** Label + control + description/error, wired together for assistive tech. */
export function Field({ label, description, error, counter, children, className }: FieldProps) {
  const id = useId()
  const descriptionId = description ? `${id}-description` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-md font-medium text-fg">
          {label}
        </label>
        {counter && (
          <span
            className={cn("text-xs tabular-nums", counter.value > counter.max ? "text-danger" : "text-fg-subtle")}
            aria-live="polite"
          >
            {counter.value.toLocaleString()} / {counter.max.toLocaleString()}
          </span>
        )}
      </div>
      {description && (
        <p id={descriptionId} className="-mt-0.5 text-sm text-fg-muted">
          {description}
        </p>
      )}
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {error && (
        <p id={errorId} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
