"use client"

import { Code2, FileSearch, KeyRound, Lightbulb, Sparkles } from "lucide-react"
import Link from "next/link"
import { LogoMark } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"

export type Suggestion = {
  label: string
  icon: React.ComponentType<{ className?: string }>
  prompt: string
  /** Opens the file picker as well — for "Analyze a document". */
  attach?: boolean
}

export const SUGGESTIONS: Suggestion[] = [
  { label: "Explain something", icon: Sparkles, prompt: "Explain this to me in simple terms: " },
  { label: "Help me code", icon: Code2, prompt: "Help me write code that " },
  { label: "Analyze a document", icon: FileSearch, prompt: "Summarize the key points of the attached document.", attach: true },
  { label: "Brainstorm an idea", icon: Lightbulb, prompt: "Brainstorm ideas for " },
]

export function EmptyHeading({ projectName }: { projectName?: string | null }) {
  return (
    <div className="flex flex-col items-center text-center">
      <LogoMark size={40} className="rise-in" />
      {projectName && <p className="rise-in mt-5 text-md text-fg-muted [animation-delay:40ms]">New chat in {projectName}</p>}
      <h1 className="rise-in mt-5 text-3xl font-medium tracking-[-0.03em] text-fg [animation-delay:60ms] sm:text-4xl">
        A calm place to think.
      </h1>
      <p className="rise-in mt-3 max-w-[30rem] text-lg text-balance text-fg-muted [animation-delay:120ms]">
        Ask anything. Build, learn and create with the models you bring.
      </p>
    </div>
  )
}

export function SuggestionChips({ onPick }: { onPick: (suggestion: Suggestion) => void }) {
  return (
    <ul className="rise-in flex flex-wrap justify-center gap-2 [animation-delay:240ms]" aria-label="Suggestions">
      {SUGGESTIONS.map((suggestion) => (
        <li key={suggestion.label}>
          <button
            type="button"
            onClick={() => onPick(suggestion)}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-line px-3.5 text-md text-fg-muted transition-colors hover:border-line-strong hover:bg-hover hover:text-fg"
          >
            <suggestion.icon className="size-4" aria-hidden="true" />
            {suggestion.label}
          </button>
        </li>
      ))}
    </ul>
  )
}

export function ConnectProviderCard() {
  return (
    <div className="rise-in mx-auto flex max-w-[34rem] flex-col items-start gap-4 rounded-xl border border-line bg-canvas p-5 [animation-delay:240ms] sm:flex-row sm:items-center">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-mist">
        <KeyRound className="size-[18px]" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-fg">Connect an AI provider</p>
        <p className="mt-0.5 text-md text-fg-muted">
          Nebula uses your own provider credentials. Add an API key to start chatting.
        </p>
      </div>
      <Button asChild>
        <Link href="/settings/providers">Connect</Link>
      </Button>
    </div>
  )
}
