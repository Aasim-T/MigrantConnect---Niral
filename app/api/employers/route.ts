import { readDb } from "@/lib/server/db"
import { handle, json, requireWorker } from "@/lib/server/auth"

export const dynamic = "force-dynamic"

// GET /api/employers — employers the worker has worked for or applied to (for the grievance form)
export function GET() {
  return handle(async () => {
    const worker = await requireWorker()
    const db = readDb()
    const ids = new Set([
      ...db.employments.filter((e) => e.workerId === worker.id).map((e) => e.employerId),
      ...db.applications.filter((a) => a.workerId === worker.id).map((a) => a.employerId),
    ])
    const employers = db.employers
      .filter((e) => ids.has(e.id))
      .map((e) => ({
        id: e.id,
        companyName: e.companyName,
        jobs: db.employments.filter((m) => m.workerId === worker.id && m.employerId === e.id).map((m) => m.title),
      }))
    const wages = db.wages
      .filter((w) => w.workerId === worker.id && w.status === "Pending")
      .map((w) => ({ id: w.id, employerId: w.employerId, jobTitle: w.jobTitle, period: w.period, amount: w.amount, dueDate: w.dueDate }))
    return json({ employers, pendingWages: wages })
  })
}
