"use client"

import { useCallback, useId, useRef, useState } from "react"

/**
 * One form-level error message that can point at the field it is about: that field is
 * marked invalid, described by the message, and focused so keyboard and screen-reader
 * users land where the fix is needed.
 */
export function useFormError<Field extends string>(initial: string | null = null) {
  const messageId = useId()
  const [error, setError] = useState<{ message: string; field: Field | null } | null>(
    initial ? { message: initial, field: null } : null,
  )
  const controls = useRef(new Map<Field, HTMLInputElement>())

  const fail = useCallback((message: string, field: Field | null = null) => {
    setError({ message, field })
    if (field) controls.current.get(field)?.focus()
  }, [])

  const clear = useCallback(() => setError(null), [])

  /** Clears the message once the user edits the field it pointed at. */
  const edited = useCallback((field: Field) => {
    setError((current) => (current?.field === field ? null : current))
  }, [])

  const register = useCallback(
    (field: Field) => (node: HTMLInputElement | null) => {
      if (node) controls.current.set(field, node)
      else controls.current.delete(field)
    },
    [],
  )

  /** Props for a field's control, merged over the ones `Field` provides. */
  function control(field: Field, describedBy?: string) {
    const invalid = error?.field === field
    return {
      ref: register(field),
      "aria-invalid": invalid ? (true as const) : undefined,
      "aria-describedby": [describedBy, invalid ? messageId : null].filter(Boolean).join(" ") || undefined,
    }
  }

  return { message: error?.message ?? null, messageId, fail, clear, edited, control }
}
