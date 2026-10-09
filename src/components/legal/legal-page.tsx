import { PublicPage } from "@/components/site/public-page"
import { publicEnv } from "@/lib/env"
import { LEGAL_UPDATED } from "@/lib/legal"

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <PublicPage>
      <h1 className="text-3xl font-semibold tracking-[-0.025em]">{title}</h1>
      <p className="mt-2 text-md text-fg-subtle">Last updated {LEGAL_UPDATED}</p>
      <OperatorDetails />
      <div className="prose-nebula mt-10 [&_h2]:mt-10">{children}</div>
    </PublicPage>
  )
}

/**
 * Who runs this deployment. Nebula is software anyone can host, so the details come from
 * NEXT_PUBLIC_OPERATOR_*; until they're set, the page says so instead of naming anyone.
 */
function OperatorDetails() {
  const operator = publicEnv.operator
  if (!operator) {
    return (
      <aside className="my-6 rounded-lg border border-line bg-canvas px-4 py-3 text-md text-fg-muted">
        Nebula Assistant is open-source software that anyone can deploy. This page describes how the software handles
        data. The operator of this deployment hasn&apos;t added their name and contact details yet; they should do so,
        and review this page, before offering the service to others. It is not legal advice.
      </aside>
    )
  }
  return (
    <aside aria-label="Operator" className="my-6 rounded-lg border border-line bg-canvas px-4 py-3 text-md text-fg-muted">
      <p>
        This service is operated by <strong className="font-medium text-fg">{operator.name}</strong>
        {operator.address && <>, {operator.address}</>}.
      </p>
      {operator.registration && <p className="mt-1">{operator.registration}</p>}
      {operator.email && (
        <p className="mt-1">
          Contact:{" "}
          <a href={`mailto:${operator.email}`} className="text-accent underline underline-offset-2">
            {operator.email}
          </a>
        </p>
      )}
    </aside>
  )
}

/** "contact the operator" with a mailto link when an address is configured. */
export function ContactOperator() {
  const email = publicEnv.operator?.email
  if (!email) return <>contact the operator of this deployment</>
  return (
    <>
      contact the operator at{" "}
      <a href={`mailto:${email}`} className="text-accent underline underline-offset-2">
        {email}
      </a>
    </>
  )
}
