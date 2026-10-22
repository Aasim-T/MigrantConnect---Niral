import { mutate, nextId, notify, nowIso, readDb } from "@/lib/server/db"
import { HttpError, handle, json, readBody, requireUser, requireWorker, str } from "@/lib/server/auth"
import { grievanceView } from "@/lib/server/views"
import { GRIEVANCE_TYPES } from "@/lib/validation"

export const dynamic = "force-dynamic"


// GET /api/grievances — worker: grievances they filed; employer: grievances against them
export function GET() {
  return handle(async () => {
    const user = await requireUser()
    const db = readDb()
    const grievances = db.grievances
      .filter((g) => (user.role === "worker" ? g.workerId === user.id : g.employerId === user.id))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((g) => grievanceView(db, g))
    return json({ grievances, types: GRIEVANCE_TYPES })
  })
}

// POST /api/grievances — worker files a grievance against an employer they work(ed) for, or a named employer
export function POST(req: Request) {
  return handle(async () => {
    const worker = await requireWorker()
    const body = await readBody<Record<string, unknown>>(req)
    const type = str(body.type, "Grievance type", { max: 60 })
    if (!GRIEVANCE_TYPES.includes(type)) throw new HttpError(400, "Select a valid grievance type")
    const title = str(body.title, "Title", { max: 150 })
    const description = str(body.description, "Description", { max: 4000 })
    const employerId = str(body.employerId, "Employer", { required: false, max: 20 })
    const amountRaw = body.amountDue
    const amountDue = amountRaw === undefined || amountRaw === "" || amountRaw === null ? undefined : Number(amountRaw)
    if (amountDue !== undefined && (!Number.isFinite(amountDue) || amountDue < 0)) {
      throw new HttpError(400, "Amount due must be a positive number")
    }

    const grievance = mutate((db) => {
      const employer = employerId ? db.employers.find((e) => e.id === employerId) : undefined
      if (employerId && !employer) throw new HttpError(400, "Employer not found")
      const employerName = employer?.companyName || str(body.employerName, "Employer name", { max: 200 })
      const wageRecordId = str(body.wageRecordId, "Wage record", { required: false, max: 20 })
      if (wageRecordId && !db.wages.some((w) => w.id === wageRecordId && w.workerId === worker.id)) {
        throw new HttpError(400, "Wage record not found")
      }
      const now = nowIso()
      const g = {
        id: nextId(db, "grievance", "GRV"),
        workerId: worker.id,
        employerId: employer?.id,
        employerName,
        title,
        type,
        description,
        status: "New" as const,
        jobTitle: str(body.jobTitle, "Job title", { required: false, max: 120 }) || undefined,
        workPeriod: str(body.workPeriod, "Work period", { required: false, max: 60 }) || undefined,
        amountDue: amountDue !== undefined ? Math.round(amountDue) : undefined,
        wageRecordId: wageRecordId || undefined,
        filedAt: now,
        updatedAt: now,
        messages: [{ from: "Worker" as const, message: description, at: now }],
      }
      db.grievances.unshift(g)
      notify(db, employer?.id, "grievance", "Grievance Filed", `${worker.name} filed a grievance: ${title}.`, `/employer/grievances/${g.id}`)
      notify(db, worker.id, "grievance", "Grievance Submitted", `Your grievance '${title}' (${g.id}) was submitted.`, `/grievances/${g.id}`)
      return grievanceView(db, g)
    })
    return json({ grievance }, 201)
  })
}
