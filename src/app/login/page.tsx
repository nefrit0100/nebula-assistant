import { redirect } from "next/navigation"

/** /login is an alias for the gateway at /. */
export default async function LoginPage(props: PageProps<"/login">) {
  const searchParams = await props.searchParams
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") query.set(key, value)
  }
  const suffix = query.toString()
  redirect(suffix ? `/?${suffix}` : "/")
}
