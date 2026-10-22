import { mutate, nextId, notify, nowIso, readDb } from "@/lib/server/db"
import { HttpError, handle, json, readBody, requireEmployer, requireUser, str } from "@/lib/server/auth"
import { grievanceView } from "@/lib/server/views"

export const dynamic = "force-dynamic"

// GET /api/wages — employments + wage records for the logged-in worker or employer
export function GET() {
  return handle(async () => {
    const user = await requireUser()
    const db = readDb()
    const mine = <T extends { workerId: string; employerId: string }>(x: T) =>
      user.role === "worker" ? x.workerId === user.id : x.employerId === user.id
    const name = (workerId: string) => db.workers.find((w) => w.id === workerId)?.name || "Unknown worker"
    const company = (employerId: string) => db.employers.find((e) => e.id === employerId)?.companyName || "Unknown employer"

    const records = db.wages.filter(mine)
    const employments = db.employments.filter(mine).map((e) => {
      const r = records.filter((w) => w.employmentId === e.id)
      return {
        ...e,
        workerName: name(e.workerId),
        employerName: company(e.employerId),
        daysWorked: r.reduce((s, w) => s + w.daysWorked, 0),
        totalEarned: r.reduce((s, w) => s + w.amount, 0),
        totalPaid: r.filter((w) => w.status === "Paid").reduce((s, w) => s + w.amount, 0),
        pendingAmount: r.filter((w) => w.status === "Pending").reduce((s, w) => s + w.amount, 0),
        lastPaidAt: r.filter((w) => w.paidAt).sort((a, b) => b.paidAt!.localeCompare(a.paidAt!))[0]?.paidAt || null,
        nextDue: r.filter((w) => w.status === "Pending").sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]?.dueDate || null,
      }
    })
    const disputes =
      user.role === "worker"
        ? db.grievances.filter((g) => g.workerId === user.id && g.type === "Wage Dispute").map((g) => grievanceView(db, g))
        : []

    return json({
      employments,
      records: records
        .map((w) => ({ ...w, workerName: name(w.workerId), employerName: company(w.employerId) }))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      disputes,
    })
  })
}

// POST /api/wages { employmentId, period, daysWorked, dailyWage?, dueDate } — employer records wages owed
export function POST(req: Request) {
  return handle(async () => {
    const employer = await requireEmployer()
    const body = await readBody<Record<string, unknown>>(req)
    const employmentId = str(body.employmentId, "Worker")
    const period = str(body.period, "Period", { max: 60 })
    const daysWorked = Number(body.daysWorked)
    if (!Number.isInteger(daysWorked) || daysWorked < 1 || daysWorked > 31) throw new HttpError(400, "Days worked must be between 1 and 31")
    const dueDate = str(body.dueDate, "Due date", { max: 10 })
    if (Number.isNaN(new Date(dueDate).getTime())) throw new HttpError(400, "Invalid due date")

    const record = mutate((db) => {
      const emp = db.employments.find((e) => e.id === employmentId && e.employerId === employer.id)
      if (!emp) throw new HttpError(404, "Employment not found")
      const dw = body.dailyWage === undefined || body.dailyWage === "" ? emp.dailyWage : Number(body.dailyWage)
      if (!Number.isFinite(dw) || dw <= 0) throw new HttpError(400, "Daily wage must be a positive number")
      const rec = {
        id: nextId(db, "wage", "WAGE"),
        employmentId: emp.id,
        workerId: emp.workerId,
        employerId: employer.id,
        jobTitle: emp.title,
        period,
        daysWorked,
        dailyWage: Math.round(dw),
        amount: Math.round(dw) * daysWorked,
        dueDate,
        status: "Pending" as const,
        createdAt: nowIso(),
      }
      db.wages.push(rec)
      notify(db, emp.workerId, "wage", "Wage Entry Recorded", `₹${rec.amount.toLocaleString("en-IN")} recorded for ${period} (${emp.title}), due ${dueDate}.`, "/wages")
      return rec
    })
    return json({ record }, 201)
  })
}

