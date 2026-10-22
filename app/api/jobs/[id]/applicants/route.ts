import { readDb } from "@/lib/server/db"
import { HttpError, handle, json, requireEmployer } from "@/lib/server/auth"
import { applicationView, jobView } from "@/lib/server/views"

export const dynamic = "force-dynamic"

// GET /api/jobs/:id/applicants — employer views applicants for one of their jobs
export function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params
    const employer = await requireEmployer()
    const db = readDb()
    const job = db.jobs.find((j) => j.id === id && j.employerId === employer.id)
    if (!job) throw new HttpError(404, "Job not found")
    const applicants = db.applications
      .filter((a) => a.jobId === id)
      .sort((a, b) => b.appliedAt.localeCompare(a.appliedAt))
      .map((a) => applicationView(db, a))
    return json({ job: jobView(db, job), applicants })
  })
}
