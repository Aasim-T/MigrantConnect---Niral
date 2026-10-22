import { mutate, readDb } from "@/lib/server/db"
import { handle, json, readBody, requireUser } from "@/lib/server/auth"

export const dynamic = "force-dynamic"

// GET /api/notifications — newest first
export function GET() {
  return handle(async () => {
    const user = await requireUser()
    const notifications = readDb()
      .notifications.filter((n) => n.userId === user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return json({ notifications, unread: notifications.filter((n) => !n.read).length })
  })
}

// PATCH /api/notifications { id?, read? } — mark one (or all, without id) as read/unread
export function PATCH(req: Request) {
  return handle(async () => {
    const user = await requireUser()
    const body = await readBody<{ id?: string; read?: boolean }>(req)
    const read = body.read !== false
    mutate((db) => {
      for (const n of db.notifications) {
        if (n.userId === user.id && (!body.id || n.id === body.id)) n.read = read
      }
    })
    return json({ ok: true })
  })
}

// DELETE /api/notifications { id? } — delete one, or all read notifications without id
export function DELETE(req: Request) {
  return handle(async () => {
    const user = await requireUser()
    const body = await readBody<{ id?: string }>(req).catch(() => ({}) as { id?: string })
    mutate((db) => {
      db.notifications = db.notifications.filter(
        (n) => n.userId !== user.id || (body.id ? n.id !== body.id : !n.read),
      )
    })
    return json({ ok: true })
  })
}
