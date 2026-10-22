import { mutate, nextId, notify, nowIso, readDb } from "@/lib/server/db"
import { HttpError, handle, json, readBody, requireUser, requireWorker, str } from "@/lib/server/auth"
import { applicationView } from "@/lib/server/views"

export const dynamic = "force-dynamic"

// GET /api/applications — worker: own applications; employer: applications to their jobs
export function GET() {
  return handle(async () => {
    const user = await requireUser()
    const db = readDb()
    const apps = db.applications
      .filter((a) => (user.role === "worker" ? a.workerId === user.id : a.employerId === user.id))
      .sort((a, b) => b.appliedAt.localeCompare(a.appliedAt))
      .map((a) => applicationView(db, a))
    return json({ applications: apps })
  })
}

// POST /api/applications { jobId, note } — worker applies for a job
export function POST(req: Request) {
  return handle(async () => {
    const worker = await requireWorker()
    const body = await readBody<{ jobId?: string; note?: string }>(req)
    const jobId = str(body.jobId, "Job")
    const note = str(body.note, "Note", { required: false, max: 1000 })

    const application = mutate((db) => {
      const job = db.jobs.find((j) => j.id === jobId)
      if (!job || job.status !== "Active" || new Date(job.deadline).getTime() < Date.now()) {
        throw new HttpError(400, "This job is no longer accepting applications")
      }
      if (db.applications.some((a) => a.jobId === jobId && a.workerId === worker.id)) {
        throw new HttpError(409, "You have already applied for this job")
      }
      const now = nowIso()
      const app = {
        id: nextId(db, "application", "APP"),
        jobId,
        workerId: worker.id,
        employerId: job.employerId,
        note,
        status: "New" as const,
        appliedAt: now,
        updatedAt: now,
      }
      db.applications.push(app)
      notify(db, job.employerId, "application", "New Job Application", `${worker.name} applied for ${job.title}.`, `/employer/jobs/${job.id}/applicants?applicant=${app.id}`)
      notify(db, worker.id, "application", "Application Submitted", `Your application for ${job.title} was submitted.`, "/applications")
      return applicationView(db, app)
    })
    return json({ application }, 201)
  })
}
