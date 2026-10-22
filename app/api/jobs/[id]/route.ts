import { mutate, notify, readDb } from "@/lib/server/db"
import { HttpError, currentUser, handle, json, readBody, requireEmployer } from "@/lib/server/auth"
import { parseJobInput } from "@/lib/server/jobs"
import { jobView, matchScore } from "@/lib/server/views"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

// GET /api/jobs/:id — job details, the worker's application (if any) and similar jobs
export function GET(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const { id } = await params
    const db = readDb()
    const job = db.jobs.find((j) => j.id === id)
    if (!job) throw new HttpError(404, "Job not found")
    const user = await currentUser()
    if (job.status !== "Active" && !(user?.role === "employer" && user.id === job.employerId)) {
      // Closed jobs stay visible to workers who applied, so their history still works.
      const applied = user?.role === "worker" && db.applications.some((a) => a.jobId === id && a.workerId === user.id)
      if (!applied) throw new HttpError(404, "This job is no longer available")
    }
    const application =
      user?.role === "worker" ? db.applications.find((a) => a.jobId === id && a.workerId === user.id) || null : null
    const similar = db.jobs
      .filter((j) => j.id !== id && j.status === "Active")
      .map((j) => ({ j, score: matchScore(job.skills, j) + (j.location === job.location ? 1 : 0) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((x) => jobView(db, x.j))
    return json({ job: jobView(db, job), application, similar })
  })
}

// PATCH /api/jobs/:id — employer edits the job or changes status ({ status: "Active" | "Closed" })
export function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    const { id } = await params
    const employer = await requireEmployer()
    const body = await readBody<Record<string, unknown>>(req)
    const job = mutate((db) => {
      const job = db.jobs.find((j) => j.id === id && j.employerId === employer.id)
      if (!job) throw new HttpError(404, "Job not found")
      if (body.status !== undefined) {
        if (body.status !== "Active" && body.status !== "Closed") throw new HttpError(400, "Invalid status")
        job.status = body.status
        if (job.status === "Active" && new Date(job.deadline).getTime() < Date.now()) {
          job.deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
        notify(db, employer.id, "job", job.status === "Active" ? "Job Activated" : "Job Closed", `The job posting for ${job.title} is now ${job.status.toLowerCase()}.`, "/employer/jobs")
      } else {
        const { fields, deadline } = parseJobInput(body)
        Object.assign(job, fields, { deadline })
        notify(db, employer.id, "job", "Job Edited", `You edited the job posting for ${job.title}.`, "/employer/jobs")
      }
      return jobView(db, job)
    })
    return json({ job })
  })
}

// DELETE /api/jobs/:id — only allowed when nobody has been hired through it
export function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const { id } = await params
    const employer = await requireEmployer()
    mutate((db) => {
      const job = db.jobs.find((j) => j.id === id && j.employerId === employer.id)
      if (!job) throw new HttpError(404, "Job not found")
      if (db.employments.some((e) => e.jobId === id)) {
        throw new HttpError(409, "Workers were hired through this job, so it cannot be deleted. Close it instead.")
      }
      for (const a of db.applications.filter((a) => a.jobId === id)) {
        notify(db, a.workerId, "application", "Job Withdrawn", `The job ${job.title} was withdrawn by the employer.`, "/applications")
      }
      db.applications = db.applications.filter((a) => a.jobId !== id)
      db.jobs = db.jobs.filter((j) => j.id !== id)
    })
    return json({ ok: true })
  })
}
