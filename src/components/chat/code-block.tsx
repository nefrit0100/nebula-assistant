"use client"

import { Check, Copy, WrapText } from "lucide-react"
import { memo, useEffect, useState } from "react"
import { cn } from "@/lib/cn"
import { useCopy } from "@/lib/hooks"
import { highlight, languageLabel, normalizeLanguage } from "./highlight"

type CodeBlockProps = { code: string; language?: string; streaming?: boolean }

export const CodeBlock = memo(function CodeBlock({ code, language, streaming = false }: CodeBlockProps) {
  const lang = normalizeLanguage(language)
  const [html, setHtml] = useState<string | null>(null)
  const [wrap, setWrap] = useState(false)
  const { copied, copy } = useCopy()
  const trimmed = code.replace(/\n$/, "")
  const lines = trimmed.split("\n")
  const numbered = lines.length >= 6

  // Highlight after the code settles; while streaming, plain text keeps up with tokens.
  useEffect(() => {
    let cancelled = false
    const handle = setTimeout(
      () => {
        void highlight(trimmed, lang).then((result) => {
          if (!cancelled && result) setHtml(result)
        })
      },
      streaming ? 600 : 0,
    )
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [trimmed, lang, streaming])

  return (
    <figure className="group/code relative my-4 overflow-hidden rounded-lg border border-line bg-code">
      <figcaption className="flex h-9 items-center justify-between gap-2 border-b border-line pl-3.5 pr-1.5">
        <span className="text-xs font-medium text-fg-subtle">{languageLabel(lang)}</span>
        <span className="flex items-center">
          <button
            type="button"
            onClick={() => setWrap((value) => !value)}
            aria-pressed={wrap}
            aria-label={wrap ? "Turn off line wrapping" : "Wrap long lines"}
            className={cn(
              "inline-flex size-7 items-center justify-center rounded-xs text-fg-subtle transition-colors hover:bg-hover hover:text-fg",
              wrap && "text-fg",
            )}
          >
            <WrapText className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => copy(trimmed)}
            className="inline-flex h-7 items-center gap-1.5 rounded-xs px-2 text-xs font-medium text-fg-subtle transition-colors hover:bg-hover hover:text-fg"
          >
            {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
            <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
          </button>
        </span>
      </figcaption>
      <div
        className={cn("code-body", wrap && "[&_.line]:whitespace-pre-wrap [&_.line]:break-words [&_code]:min-w-0")}
        data-numbered={numbered}
      >
        {html && !streaming ? (
          <div dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <pre>
            <code>
              {lines.map((line, index) => (
                <span key={index} className="line">
                  {line}
                  {"\n"}
                </span>
              ))}
            </code>
          </pre>
        )}
      </div>
    </figure>
  )
})
