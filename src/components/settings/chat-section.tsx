"use client"

import { ModelSelector } from "@/components/chat/model-selector"
import { Switch } from "@/components/ui/switch"
import { useModelSelection } from "@/lib/chat/use-model-selection"
import { useModKey } from "@/lib/hooks"
import { useActions, useWorkspaceState } from "@/lib/workspace/context"
import { SettingsGroup, SettingsRow, SettingsSection } from "./primitives"

export function ChatSection() {
  const actions = useActions()
  const sendOnEnter = useWorkspaceState((state) => state.settings.sendOnEnter)
  const showReasoning = useWorkspaceState((state) => state.settings.showReasoning)
  const model = useModelSelection(null)
  const mod = useModKey()

  return (
    <SettingsSection title="Chat" description="How messages are sent and which model new chats start with.">
      <SettingsGroup>
        <SettingsRow
          label="Default model"
          description="New conversations start with this model. Picking a model in a chat also updates it."
        >
          <div className="rounded-md border border-line-strong">
            <ModelSelector selected={model.selected} selectedInfo={model.info} connected={model.connected} onSelect={model.select} />
          </div>
        </SettingsRow>
        <SettingsRow
          label="Send with Enter"
          labelId="send-on-enter"
          description={
            sendOnEnter
              ? "Enter sends, Shift + Enter adds a new line. On touch screens, use the send button."
              : `Enter adds a new line. Press ${mod} + Enter to send.`
          }
        >
          <Switch aria-labelledby="send-on-enter" checked={sendOnEnter} onCheckedChange={(value) => void actions.updateSettings({ sendOnEnter: value })} />
        </SettingsRow>
        <SettingsRow
          label="Show thought process"
          labelId="show-reasoning"
          description="When a model shares its reasoning, show it above the reply. Some providers bill reasoning as output tokens either way."
        >
          <Switch aria-labelledby="show-reasoning" checked={showReasoning} onCheckedChange={(value) => void actions.updateSettings({ showReasoning: value })} />
        </SettingsRow>
      </SettingsGroup>
    </SettingsSection>
  )
}
