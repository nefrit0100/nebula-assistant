import { cn } from "@/lib/cn"

export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string
  description?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section aria-labelledby="settings-title">
      <h2 id="settings-title" className="text-2xl font-semibold tracking-[-0.02em]">
        {title}
      </h2>
      {description && <p className="mt-1.5 text-md text-fg-muted">{description}</p>}
      <div className="mt-8 flex flex-col gap-10">{children}</div>
    </section>
  )
}

export function SettingsGroup({
  title,
  description,
  children,
  className,
}: {
  title?: string
  description?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      {title && <h3 className="text-md font-semibold text-fg">{title}</h3>}
      {description && <p className="mt-0.5 text-sm text-fg-muted">{description}</p>}
      <div className={cn(title && "mt-3")}>{children}</div>
    </div>
  )
}

/** A label/description on the left, a control on the right; stacks on narrow screens. */
export function SettingsRow({
  label,
  description,
  htmlFor,
  labelId,
  children,
  className,
}: {
  label: React.ReactNode
  description?: React.ReactNode
  htmlFor?: string
  labelId?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-line py-4 first:pt-0 last:border-b-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-8",
        className,
      )}
    >
      <div className="min-w-0">
        {htmlFor ? (
          <label htmlFor={htmlFor} id={labelId} className="text-md font-medium text-fg">
            {label}
          </label>
        ) : (
          <p id={labelId} className="text-md font-medium text-fg">
            {label}
          </p>
        )}
        {description && <p className="mt-0.5 text-sm text-fg-muted">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}
