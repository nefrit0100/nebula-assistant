"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { isProviderId, type ModelInfo, type ModelRef, type ProviderId } from "@/lib/providers/types"
import { shallowEqual } from "@/lib/store"
import { useActions, useWorkspaceState } from "@/lib/workspace/context"

/**
 * Resolves which model a chat uses, in priority order:
 *   1. the model the conversation last used (if its provider is still connected)
 *   2. the user's last chosen model
 *   3. the first featured model of the first connected provider
 * Choosing a model also makes it the default for new chats.
 */
export function useModelSelection(conversationModel: { provider: string | null; model: string | null } | null) {
  const actions = useActions()
  const connected = useWorkspaceState(
    (state) => state.connections.map((connection) => connection.provider),
    shallowEqual,
  )
  const defaults = useWorkspaceState(
    (state) => ({ provider: state.settings.defaultProvider, model: state.settings.defaultModel }),
    shallowEqual,
  )
  const modelsState = useWorkspaceState((state) => state.models)

  const [chosen, setChosen] = useState<ModelRef | null>(null)

  const usable = (ref: { provider: string | null; model: string | null } | null): ModelRef | null =>
    ref?.provider && ref.model && isProviderId(ref.provider) && connected.includes(ref.provider)
      ? { provider: ref.provider, model: ref.model }
      : null

  let fallback: ModelRef | null = null
  for (const provider of connected) {
    const entry = modelsState.providers.find((p) => p.provider === provider)
    const model = entry?.models.find((m) => m.featured) ?? entry?.models[0]
    if (model) {
      fallback = { provider, model: model.id }
      break
    }
  }

  // Keep a stable object identity so effects and memos keyed on it don't re-run every render.
  const resolved = usable(chosen) ?? usable(conversationModel) ?? usable(defaults) ?? fallback
  const selectedProvider = resolved?.provider ?? null
  const selectedModel = resolved?.model ?? null
  const selected = useMemo<ModelRef | null>(
    () => (selectedProvider && selectedModel ? { provider: selectedProvider, model: selectedModel } : null),
    [selectedProvider, selectedModel],
  )

  // Without a remembered model we need the catalog to pick one.
  useEffect(() => {
    if (!selected && connected.length > 0 && modelsState.status === "idle") void actions.loadModels()
  }, [selected, connected.length, modelsState.status, actions])

  const select = useCallback(
    (ref: ModelRef) => {
      setChosen(ref)
      if (ref.provider !== defaults.provider || ref.model !== defaults.model) {
        void actions.updateSettings({ defaultProvider: ref.provider, defaultModel: ref.model })
      }
    },
    [actions, defaults.provider, defaults.model],
  )

  const info: ModelInfo | null = useMemo(() => {
    if (!selected) return null
    return (
      modelsState.providers.find((p) => p.provider === selected.provider)?.models.find((m) => m.id === selected.model) ?? null
    )
  }, [modelsState.providers, selected])

  return { selected, select, info, hasProviders: connected.length > 0, connected: connected as ProviderId[] }
}
