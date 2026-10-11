import { publicEnv } from "@/lib/env"
import { PROVIDER_LIST } from "@/lib/providers/registry"

type Operator = NonNullable<(typeof publicEnv)["operator"]>

/** schema.org Organization for whoever operates this deployment (NEXT_PUBLIC_OPERATOR_*). */
export function organizationSchema(operator: Operator, siteUrl = publicEnv.siteUrl) {
  return {
    "@type": "Organization",
    "@id": `${siteUrl}/#organization`,
    name: operator.name,
    url: siteUrl,
    logo: `${siteUrl}/brand/icon-512.png`,
    ...(operator.email
      ? {
          email: operator.email,
          contactPoint: { "@type": "ContactPoint", contactType: "customer support", email: operator.email, url: `${siteUrl}/contact` },
        }
      : {}),
    // The operator address is configured as one line, so it isn't split into parts.
    ...(operator.address ? { address: { "@type": "PostalAddress", streetAddress: operator.address } } : {}),
    ...(publicEnv.repoUrl ? { sameAs: [publicEnv.repoUrl] } : {}),
  }
}

/** JSON-LD for the homepage: the app itself, plus its operator when one is configured. */
export function homeStructuredData(siteUrl = publicEnv.siteUrl, operator = publicEnv.operator) {
  const organization = operator ? organizationSchema(operator, siteUrl) : null
  const app = {
    "@type": "SoftwareApplication",
    "@id": `${siteUrl}/#app`,
    name: "Nebula Assistant",
    alternateName: "Nebula",
    description: `A free, open-source AI assistant. Connect your own ${PROVIDER_LIST.map((p) => p.name).join(", ")} API keys and chat with any model they can use in one workspace.`,
    url: siteUrl,
    image: `${siteUrl}/opengraph-image`,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web browser",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    license: "https://opensource.org/licenses/MIT",
    featureList: [
      "Bring your own API key for each provider",
      "API keys encrypted with AES-256-GCM and only decrypted on the server",
      "Streaming replies with Markdown, code highlighting and math",
      "Projects with shared instructions",
      "Full-text search across conversations",
    ],
    ...(publicEnv.repoUrl ? { sameAs: [publicEnv.repoUrl] } : {}),
    ...(organization ? { publisher: { "@id": organization["@id"] } } : {}),
  }
  return { "@context": "https://schema.org", "@graph": organization ? [app, organization] : [app] }
}

/** Serializes JSON-LD for a <script> tag; "<" is escaped so the content can't close the tag. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c")
}
