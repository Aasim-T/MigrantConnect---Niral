import { mutate, notify, nowIso } from "@/lib/server/db"
import { HttpError, handle, json, readBody, requireEmployer } from "@/lib/server/auth"

// PATCH /api/employments/:id { end: true } or { dailyWage } — employer ends an employment or changes the daily wage
export function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params
    const employer = await requireEmployer()
    const body = await readBody<{ end?: boolean; dailyWage?: number }>(req)
    const employment = mutate((db) => {
      const e = db.employments.find((x) => x.id === id && x.employerId === employer.id)
      if (!e) throw new HttpError(404, "Employment not found")
      if (body.dailyWage !== undefined) {
        const dw = Number(body.dailyWage)
        if (!Number.isFinite(dw) || dw <= 0) throw new HttpError(400, "Daily wage must be a positive number")
        e.dailyWage = Math.round(dw)
      }
      if (body.end) {
        if (e.status === "Ended") throw new HttpError(409, "Employment already ended")
        e.status = "Ended"
        e.endDate = nowIso().slice(0, 10)
        notify(db, e.workerId, "wage", "Employment Ended", `Your employment as ${e.title} at ${employer.companyName} ended on ${e.endDate}.`, "/wages")
      }
      return e
    })
    return json({ employment })
  })
}
