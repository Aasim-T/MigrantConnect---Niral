import { destroySession, handle, json } from "@/lib/server/auth"

export function POST() {
  return handle(async () => {
    await destroySession()
    return json({ ok: true })
  })
}
