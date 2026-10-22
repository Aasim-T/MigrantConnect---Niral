import type { ApplicationStatus } from "@/lib/types"
import { mutate, nextId, notify, nowIso } from "@/lib/server/db"
import { HttpError, handle, json, readBody, requireUser } from "@/lib/server/auth"
import { applicationView } from "@/lib/server/views"

const EMPLOYER_STATUSES: ApplicationStatus[] = ["New", "Shortlisted", "Interviewed", "Selected", "Rejected"]

const WORKER_MESSAGES: Record<ApplicationStatus, string> = {
  New: "is back under review",
  Shortlisted: "was shortlisted",
  Interviewed: "was marked as interviewed",
  Selected: "was selected — you are hired!",
  Rejected: "was not selected",
}

// PATCH /api/applications/:id
//   employer: { status, dailyWage? } — selecting a worker creates an employment record used for wages
//   worker:   { withdraw: true }     — withdraw an application that is not yet decided
export function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params
    const user = await requireUser()
    const body = await readBody<{ status?: ApplicationStatus; dailyWage?: number; withdraw?: boolean }>(req)

    const result = mutate((db) => {
      const app = db.applications.find((a) => a.id === id)
      if (!app) throw new HttpError(404, "Application not found")
      const job = db.jobs.find((j) => j.id === app.jobId)

      if (user.role === "worker") {
        if (app.workerId !== user.id || !body.withdraw) throw new HttpError(403, "Not allowed")
        if (app.status === "Selected") throw new HttpError(409, "You were already hired for this job")
        db.applications = db.applications.filter((a) => a.id !== id)
        notify(db, app.employerId, "application", "Application Withdrawn", `${user.name} withdrew the application for ${job?.title ?? "a job"}.`, `/employer/jobs/${app.jobId}/applicants`)
        return null
      }

      if (app.employerId !== user.id) throw new HttpError(403, "Not allowed")
      const status = body.status
      if (!status || !EMPLOYER_STATUSES.includes(status)) throw new HttpError(400, "Invalid status")
      if (app.status === "Selected" && status !== "Selected") {
        throw new HttpError(409, "This worker is already hired. End the employment from Wage Management instead.")
      }
      app.status = status
      app.updatedAt = nowIso()

      if (status === "Selected" && job && !db.employments.some((e) => e.applicationId === app.id)) {
        // Default daily wage: monthly minimum / 26 working days, unless the employer specified one.
        const dw = Number(body.dailyWage)
        const dailyWage = Number.isFinite(dw) && dw > 0 ? Math.round(dw) : Math.round(job.salaryMin / 26)
        db.employments.push({
          id: nextId(db, "employment", "EMPL"),
          workerId: app.workerId,
          employerId: app.employerId,
          jobId: job.id,
          applicationId: app.id,
          title: job.title,
          location: job.location,
          dailyWage,
          startDate: nowIso().slice(0, 10),
          status: "Active",
        })
      }

      notify(db, app.workerId, "application", "Application Status Update", `Your application for ${job?.title ?? "a job"} at ${user.companyName} ${WORKER_MESSAGES[status]}`, "/applications")
      return applicationView(db, app)
    })
    return json({ application: result })
  })
}
