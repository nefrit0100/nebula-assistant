"use client"

import { useRef, useSyncExternalStore } from "react"

export type Store<T> = {
  get: () => T
  set: (update: Partial<T> | ((state: T) => Partial<T>)) => void
  subscribe: (listener: () => void) => () => void
}

/** A minimal external store: components subscribe to slices via useStoreSelector. */
export function createStore<T extends object>(initial: T): Store<T> {
  let state = initial
  const listeners = new Set<() => void>()
  return {
    get: () => state,
    set(update) {
      const patch = typeof update === "function" ? update(state) : update
      state = { ...state, ...patch }
      for (const listener of listeners) listener()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

/**
 * Subscribes to a derived slice. Re-renders only when the selected value changes
 * (Object.is, or the optional equality function for derived arrays/objects).
 */
export function useStoreSelector<T, S>(
  store: Store<T>,
  selector: (state: T) => S,
  equals: (a: S, b: S) => boolean = Object.is,
): S {
  const cache = useRef<{ state: T; value: S } | null>(null)
  const getSnapshot = () => {
    const state = store.get()
    if (cache.current && cache.current.state === state) return cache.current.value
    const next = selector(state)
    if (cache.current && equals(cache.current.value, next)) {
      cache.current = { state, value: cache.current.value }
      return cache.current.value
    }
    cache.current = { state, value: next }
    return next
  }
  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot)
}

export function shallowEqual<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((value, index) => Object.is(value, b[index]))
  }
  if (typeof a !== "object" || typeof b !== "object" || !a || !b) return false
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  return (
    keysA.length === keysB.length &&
    keysA.every((key) => Object.is((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]))
  )
}
