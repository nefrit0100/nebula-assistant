import { authenticate, json } from "@/lib/server/api"
import { listConnections } from "@/lib/server/connections"

export async function GET() {
  const auth = await authenticate()
  if (auth instanceof Response) return auth
  return json({ connections: await listConnections(auth.supabase) })
}
