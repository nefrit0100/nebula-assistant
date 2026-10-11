import type { Metadata } from "next"
import Link from "next/link"
import { ContactOperator } from "@/components/legal/legal-page"
import { PublicPage } from "@/components/site/public-page"
import { publicEnv } from "@/lib/env"

export const metadata: Metadata = {
  title: "Contact",
  description: "How to get help with Nebula Assistant, report a bug, or report a security issue.",
  alternates: { canonical: "/contact" },
}

const LINK = "text-accent underline underline-offset-2"

export default function ContactPage() {
  const { operator, repoUrl } = publicEnv
  return (
    <PublicPage>
      <h1 className="text-3xl font-semibold tracking-[-0.025em]">Contact</h1>
      <p className="mt-2 text-md text-fg-muted">The quickest way to get each kind of help.</p>
      <div className="prose-nebula mt-10 [&_h2]:mt-10">
        {operator && (
          <p>
            This deployment is operated by {operator.name}
            {operator.address && <>, {operator.address}</>}.
            {operator.email && (
              <>
                {" "}
                Email:{" "}
                <a href={`mailto:${operator.email}`} className={LINK}>
                  {operator.email}
                </a>
                .
              </>
            )}
          </p>
        )}

        <h2>Help using Nebula</h2>
        <p>
          Most questions — creating an account, connecting a provider, choosing a model, fixing a key that stopped
          working — are answered in the{" "}
          <Link href="/docs" className={LINK}>
            docs
          </Link>
          , including a troubleshooting section. Problems with a provider account itself, such as billing, quota or a
          revoked key, are handled by that provider&apos;s support.
        </p>

        <h2>Bugs and feature requests</h2>
        <p>
          {repoUrl ? (
            <>
              Nebula is open source, so bugs and ideas are tracked in public.{" "}
              <a href={`${repoUrl}/issues`} className={LINK}>
                Open an issue on GitHub
              </a>{" "}
              with what you did, what you expected and what happened instead. Never include API keys or private
              conversation content in an issue.
            </>
          ) : (
            <>
              To report a bug or suggest a feature, <ContactOperator />. Describe what you did, what you expected and
              what happened instead, and never include API keys.
            </>
          )}
        </p>

        <h2>Security issues</h2>
        <p>
          If you find a vulnerability, please report it privately rather than in a public issue
          {repoUrl ? (
            <>
              , through{" "}
              <a href={`${repoUrl}/security`} className={LINK}>
                the repository&apos;s security page
              </a>
            </>
          ) : null}
          {operator?.email ? (
            <>
              {" "}
              or by email to{" "}
              <a href={`mailto:${operator.email}`} className={LINK}>
                {operator.email}
              </a>
            </>
          ) : null}
          . Include the steps to reproduce it, and give us a reasonable time to fix it before disclosing it.
        </p>

        <h2>Your data and privacy</h2>
        <p>
          You can export your data, delete all conversations or delete your account yourself in Settings → Privacy.
          For any other privacy or data-protection request, <ContactOperator />. The{" "}
          <Link href="/privacy" className={LINK}>
            Privacy Policy
          </Link>{" "}
          explains what is stored and why.
        </p>
      </div>
    </PublicPage>
  )
}
