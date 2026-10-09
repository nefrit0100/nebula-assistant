import Link from "next/link"
import { Logo } from "@/components/brand/logo"
import { DocsDialog } from "@/components/docs/docs-dialog"
import { SkipLink } from "@/components/ui/skip-link"
import { publicEnv } from "@/lib/env"

/**
 * Two-column auth layout. The form column comes first in the DOM and stays
 * usable at any width; the mist panel explains BYOK on large screens.
 */
export function AuthShell({ children, googleEnabled = false }: { children: React.ReactNode; googleEnabled?: boolean }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]">
      <SkipLink />
      <div className="auth-form-bg flex min-h-dvh flex-col px-5 pb-6 pt-5 sm:px-10 sm:pt-8">
        <Link href="/" className="self-start rounded-sm" aria-label="Nebula home">
          <Logo />
        </Link>
        <main id="main" className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[360px]">{children}</div>
        </main>
        <AuthFooter />
      </div>
      <BrandPanel googleEnabled={googleEnabled} />
    </div>
  )
}

function AuthFooter() {
  return (
    <footer className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-fg-subtle">
      <DocsDialog>
        <button type="button" className="rounded-xs hover:text-fg">
          Docs
        </button>
      </DocsDialog>
      <Link href="/privacy" className="rounded-xs hover:text-fg">
        Privacy
      </Link>
      <Link href="/terms" className="rounded-xs hover:text-fg">
        Terms
      </Link>
      <Link href="/cookies" className="rounded-xs hover:text-fg">
        Cookies
      </Link>
      {publicEnv.repoUrl && (
        <a href={publicEnv.repoUrl} className="rounded-xs hover:text-fg" target="_blank" rel="noopener noreferrer">
          Source code
        </a>
      )}
      <span className="ml-auto hidden sm:inline">Free and open source</span>
    </footer>
  )
}

function BrandPanel({ googleEnabled }: { googleEnabled: boolean }) {
  const steps = [
    {
      title: "Create an account",
      body: googleEnabled ? "With your email or Google account." : "With your email address.",
    },
    {
      title: "Connect a provider",
      body: "Paste an API key from OpenAI, Anthropic, DeepSeek, Alibaba, Zhipu, OpenRouter or OpenCode.",
    },
    { title: "Start a conversation", body: "Pick a model your key can use and ask away." },
  ]

  return (
    <aside
      aria-label="About Nebula"
      className="auth-art-right relative hidden bg-mist lg:flex lg:flex-col lg:justify-between lg:px-14 lg:py-12 xl:px-20"
    >
      <div className="relative max-w-[30rem] pt-[12vh]">
        <h2 className="rise-in text-4xl font-medium tracking-[-0.03em] text-balance text-fg">
          <span className="block">Bring your own models.</span>
          <span className="block">One calm place to use them.</span>
        </h2>
        <p className="rise-in mt-5 max-w-[26rem] text-lg text-fg-muted [animation-delay:80ms]">
          Nebula is a free, open-source AI assistant. You connect the providers you already pay for, and chat with
          all of them in one place.
        </p>
      </div>

      <div className="relative max-w-[30rem]">
        <ol className="flex flex-col gap-5">
          {steps.map((step, index) => (
            <li key={step.title} className="grid grid-cols-[28px_1fr] gap-3">
              <span className="flex size-7 items-center justify-center rounded-full bg-fg text-sm font-semibold tabular-nums text-fg-inverse">
                {index + 1}
              </span>
              <div>
                <p className="font-medium text-fg">{step.title}</p>
                <p className="mt-0.5 text-md text-fg-muted">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-10 border-t border-fg/10 pt-5 text-sm leading-relaxed text-fg-muted">
          Your API keys are encrypted before they are stored and are only decrypted on the server to call the provider
          you choose. Messages you send are processed by that provider under its own terms.
        </p>
      </div>
    </aside>
  )
}
