import { permanentRedirect } from "next/navigation"

/** /login is a permanent alias for the gateway at / (308, so search engines fold it into /). */
export default async function LoginPage(props: PageProps<"/login">) {
  const searchParams = await props.searchParams
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") query.set(key, value)
  }
  const suffix = query.toString()
  permanentRedirect(suffix ? `/?${suffix}` : "/")
}
