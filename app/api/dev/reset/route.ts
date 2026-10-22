import { resetDb } from "@/lib/server/db"
import { DEMO_MODE, HttpError, handle, json } from "@/lib/server/auth"

// POST /api/dev/reset — restore seed data (demo mode only)
export function POST() {
  return handle(async () => {
    if (!DEMO_MODE) throw new HttpError(403, "Reset is only available in demo mode")
    resetDb()
    return json({ ok: true })
  })
}
