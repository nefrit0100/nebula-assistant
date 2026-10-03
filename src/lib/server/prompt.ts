import "server-only"

import { responseStyleFor } from "@/lib/settings"

type PromptInput = {
  nickname?: string
  aboutMe?: string
  responseStyle?: string
  customInstructions?: string
  project?: { name: string; instructions: string } | null
  now?: Date
}

/** The interface renders these blocks as downloadable file cards (src/lib/chat/files.ts). */
const FILES_SECTION = [
  "## Files",
  "When the main deliverable is long content the user will save or reuse, such as a complete code file (roughly 40 lines or more), a long document or article, or a prompt, deliver it as a file instead of in the message body:",
  "",
  '<file name="landing-page.html">',
  "…the complete content…",
  "</file>",
  "",
  "- Put the opening and closing tags on their own lines, and give the file a short, descriptive name with the right extension: .md for documents, articles and prompts; the language's usual extension for code.",
  "- Inside the block, write only the file's raw content, without wrapping it in a code fence.",
  "- Use one block per file, and keep the text around it brief: what the file contains and how to use it.",
  "- Short snippets, explanations and ordinary answers stay in the message as usual.",
].join("\n")

/**
 * Assembles the system prompt. Stable content comes first and the date last,
 * so providers with prefix caching can reuse the shared prefix across turns.
 */
export function buildSystemPrompt(input: PromptInput): string {
  const sections: string[] = [
    [
      "You are Nebula, a thoughtful and capable AI assistant.",
      "Format responses in GitHub-flavored Markdown: use headings, lists and tables when they aid clarity, fenced code blocks with a language tag for code, and LaTeX for math (\\( … \\) inline, $$ … $$ on its own lines for display).",
      "Be accurate. If you are unsure or lack information, say so instead of guessing.",
    ].join("\n"),
  ]

  sections.push(FILES_SECTION)

  sections.push(`## Response style\n${responseStyleFor(input.responseStyle).instruction}`)

  const about: string[] = []
  if (input.nickname?.trim()) about.push(`Preferred name: ${input.nickname.trim()}`)
  if (input.aboutMe?.trim()) about.push(input.aboutMe.trim())
  if (about.length) {
    sections.push(`## About the user (provided by the user)\n${about.join("\n")}`)
  }

  if (input.customInstructions?.trim()) {
    sections.push(`## The user's instructions\n${input.customInstructions.trim()}`)
  }

  if (input.project && (input.project.instructions.trim() || input.project.name)) {
    const body = input.project.instructions.trim()
    sections.push(`## Project: ${input.project.name}${body ? `\n${body}` : ""}`)
  }

  const now = input.now ?? new Date()
  sections.push(`Current date: ${now.toISOString().slice(0, 10)}.`)
  return sections.join("\n\n")
}

/** A readable conversation title from the first message. */
export function deriveTitle(content: string): string {
  const firstLine =
    content
      .replace(/```[\s\S]*?```/g, " ")
      .split("\n")
      .map((line) => line.trim())
      .find(Boolean) ?? ""
  const plain = firstLine
    .replace(/[#>*_`~[\]()!|]/g, "")
    .replace(/\s+/g, " ")
    .trim()
  if (!plain) return "New chat"
  if (plain.length <= 60) return plain
  const cut = plain.slice(0, 60)
  const lastSpace = cut.lastIndexOf(" ")
  return `${(lastSpace > 30 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}
