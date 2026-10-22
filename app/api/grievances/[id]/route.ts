import type { GrievanceStatus } from "@/lib/types"
import { mutate, notify, nowIso, readDb } from "@/lib/server/db"
import { HttpError, handle, json, readBody, requireUser, str } from "@/lib/server/auth"
import { grievanceView } from "@/lib/server/views"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

const STATUSES: GrievanceStatus[] = ["New", "In Progress", "Resolved"]

// GET /api/grievances/:id — visible to the worker who filed it and the employer it names
export function GET(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const { id } = await params
    const user = await requireUser()
    const db = readDb()
    const g = db.grievances.find((x) => x.id === id)
    if (!g || (g.workerId !== user.id && g.employerId !== user.id)) throw new HttpError(404, "Grievance not found")
    const wage = g.wageRecordId ? db.wages.find((w) => w.id === g.wageRecordId) || null : null
    return json({ grievance: grievanceView(db, g), wage })
  })
}

// PATCH /api/grievances/:id
//   both:     { message }                      — add to the conversation
//   employer: { status, resolution? }          — move to In Progress / Resolved
//   worker:   { acknowledge: true, feedback? } — accept a resolution
//   worker:   { reopen: true, message }        — reopen a resolved grievance
export function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    const { id } = await params
    const user = await requireUser()
    const body = await readBody<Record<string, unknown>>(req)

    const grievance = mutate((db) => {
      const g = db.grievances.find((x) => x.id === id)
      if (!g || (g.workerId !== user.id && g.employerId !== user.id)) throw new HttpError(404, "Grievance not found")
      const isWorker = user.role === "worker"
      const now = nowIso()
      const other = isWorker ? g.employerId : g.workerId
      const link = isWorker ? `/employer/grievances/${g.id}` : `/grievances/${g.id}`

      if (body.message !== undefined) {
        const message = str(body.message, "Message", { max: 2000 })
        g.messages.push({ from: isWorker ? "Worker" : "Employer", message, at: now })
        if (!isWorker && g.status === "New") g.status = "In Progress"
        notify(db, other, "grievance", "New Grievance Message", `New message on '${g.title}'.`, link)
      }

      if (!isWorker && body.status !== undefined) {
        const status = body.status as GrievanceStatus
        if (!STATUSES.includes(status)) throw new HttpError(400, "Invalid status")
        if (status === "Resolved") {
          const resolution = str(body.resolution, "Resolution details", { max: 2000 })
          g.resolution = resolution
          g.resolvedAt = now
          g.acknowledged = false
          g.messages.push({ from: "Employer", message: `Resolved: ${resolution}`, at: now })
        }
        g.status = status
        notify(db, g.workerId, "grievance", status === "Resolved" ? "Grievance Resolved" : "Grievance Update", `Your grievance '${g.title}' is now ${status.toLowerCase()}.`, `/grievances/${g.id}`)
      }

      if (isWorker && body.acknowledge) {
        if (g.status !== "Resolved") throw new HttpError(409, "Only resolved grievances can be acknowledged")
        g.acknowledged = true
        g.feedback = str(body.feedback, "Feedback", { required: false, max: 1000 }) || undefined
        notify(db, g.employerId, "grievance", "Resolution Accepted", `${user.name} accepted the resolution for '${g.title}'.`, link)
      }

      if (isWorker && body.reopen) {
        if (g.status !== "Resolved") throw new HttpError(409, "Only resolved grievances can be reopened")
        const message = str(body.message ?? body.reason, "Reason", { max: 2000 })
        if (body.message === undefined) g.messages.push({ from: "Worker", message, at: now })
        g.status = "In Progress"
        g.acknowledged = false
        g.resolvedAt = undefined
        notify(db, g.employerId, "grievance", "Grievance Reopened", `${user.name} reopened '${g.title}'.`, link)
      }

      g.updatedAt = now
      return grievanceView(db, g)
    })
    return json({ grievance })
  })
}
