import assert from "node:assert/strict"
import { test } from "node:test"
import { homeStructuredData, serializeJsonLd } from "./structured-data"

const SITE = "https://nebula.test"
const OPERATOR = {
  name: "Example Ltd",
  address: "1 Main St, 10115 Berlin, Germany",
  email: "hello@example.com",
  registration: null,
}

test("names the website for search engines' site names", () => {
  const data = homeStructuredData(SITE, null)
  const [website] = data["@graph"] as Record<string, unknown>[]
  assert.equal(website["@type"], "WebSite")
  assert.equal(website.name, "Nebula Assistant")
  assert.equal(website.alternateName, "Nebula")
  assert.equal(website.url, SITE)
  assert.equal(website.publisher, undefined, "no publisher without operator details")
})

test("describes the app as a free SoftwareApplication", () => {
  const data = homeStructuredData(SITE, null)
  assert.equal(data["@context"], "https://schema.org")
  const app = (data["@graph"] as Record<string, unknown>[])[1]
  assert.equal(app["@type"], "SoftwareApplication")
  assert.equal(app.name, "Nebula Assistant")
  assert.equal(app.url, SITE)
  assert.ok(typeof app.description === "string" && app.description.length > 50)
  assert.deepEqual(app.offers, { "@type": "Offer", price: "0", priceCurrency: "USD" })
  assert.equal(data["@graph"].length, 2, "no Organization without operator details")
})

test("adds a complete Organization when the operator is configured", () => {
  const data = homeStructuredData(SITE, OPERATOR)
  const [website, app, org] = data["@graph"] as Record<string, unknown>[]
  assert.equal(org["@type"], "Organization")
  assert.equal(org.name, OPERATOR.name)
  assert.deepEqual(org.contactPoint, {
    "@type": "ContactPoint",
    contactType: "customer support",
    email: OPERATOR.email,
    url: `${SITE}/contact`,
  })
  assert.deepEqual(org.address, { "@type": "PostalAddress", streetAddress: OPERATOR.address })
  assert.deepEqual(app.publisher, { "@id": org["@id"] })
  assert.deepEqual(website.publisher, { "@id": org["@id"] })
})

test("omits contact fields the operator hasn't set", () => {
  const data = homeStructuredData(SITE, { ...OPERATOR, address: null, email: null })
  const org = (data["@graph"] as Record<string, unknown>[])[2]
  assert.equal(org.contactPoint, undefined)
  assert.equal(org.address, undefined)
})

test("serialized JSON-LD can't close its <script> tag", () => {
  const html = serializeJsonLd({ name: "</script><script>alert(1)</script>" })
  assert.ok(!html.includes("<"))
  assert.deepEqual(JSON.parse(html), { name: "</script><script>alert(1)</script>" })
})
