import { readDb } from "@/lib/server/db"
import { DEMO_MODE, handle, json, publicUser, requireUser } from "@/lib/server/auth"

export const dynamic = "force-dynamic"

export function GET() {
  return handle(async () => {
    const user = await requireUser()
    const unread = readDb().notifications.filter((n) => n.userId === user.id && !n.read).length
    return json({ user: publicUser(user), unreadNotifications: unread, demoMode: DEMO_MODE })
  })
}
