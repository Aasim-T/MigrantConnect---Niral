import { mutate, nextId, notify, nowIso, readDb } from "@/lib/server/db"
import { currentUser, handle, json, readBody, requireEmployer } from "@/lib/server/auth"
import { parseJobInput } from "@/lib/server/jobs"
import { jobView, matchScore } from "@/lib/server/views"

export const dynamic = "force-dynamic"

// GET /api/jobs
//   employer: ?mine=1 -> own jobs (all statuses)
//   worker/public: active jobs; ?recommended=1 sorts by skill match for the logged-in worker
export function GET(req: Request) {
  return handle(async () => {
    const url = new URL(req.url)
    const user = await currentUser()
    const db = readDb()

    if (url.searchParams.get("mine") && user?.role === "employer") {
      const jobs = db.jobs
        .filter((j) => j.employerId === user.id)
        .sort((a, b) => b.postedAt.localeCompare(a.postedAt))
        .map((j) => jobView(db, j))
      return json({ jobs })
    }

    const now = Date.now()
    let jobs = db.jobs.filter((j) => j.status === "Active" && new Date(j.deadline).getTime() > now)
    const appliedIds = new Set(
      user?.role === "worker" ? db.applications.filter((a) => a.workerId === user.id).map((a) => a.jobId) : [],
    )

    if (url.searchParams.get("recommended") && user?.role === "worker") {
      jobs = jobs
        .filter((j) => !appliedIds.has(j.id))
        .map((j) => ({ j, score: matchScore(user.skills, j, user.location) }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score || b.j.postedAt.localeCompare(a.j.postedAt))
        .map((x) => x.j)
    } else {
      jobs = jobs.sort((a, b) => b.postedAt.localeCompare(a.postedAt))
    }

    return json({ jobs: jobs.map((j) => ({ ...jobView(db, j), applied: appliedIds.has(j.id) })) })
  })
}

// POST /api/jobs — employer creates a job posting
export function POST(req: Request) {
  return handle(async () => {
    const employer = await requireEmployer()
    const { fields, deadline } = parseJobInput(await readBody(req))

    const job = mutate((db) => {
      const created = {
        ...fields,
        id: nextId(db, "job", "JOB"),
        employerId: employer.id,
        status: "Active" as const,
        postedAt: nowIso(),
        deadline,
      }
      db.jobs.push(created)
      notify(db, employer.id, "job", "Job Posted", `Your job posting for ${created.title} is now live.`, `/employer/jobs/${created.id}/applicants`)
      // Tell workers whose skills match about the new job.
      for (const w of db.workers) {
        if (created.skills.some((s) => w.skills.includes(s))) {
          notify(db, w.id, "job", "New Job Match", `${created.title} at ${employer.companyName} (${created.location}) matches your skills.`, `/jobs/${created.id}`)
        }
      }
      return jobView(db, created)
    })
    return json({ job }, 201)
  })
}
