import type { Application, Database, Grievance, Job, WelfareScheme, Worker } from "@/lib/types"

// Builders that join records into the shapes the UI consumes.

export function ageFromDob(dob: string): number | null {
  if (!dob) return null
  const d = new Date(dob)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--
  return age
}

export function jobView(db: Database, job: Job) {
  const employer = db.employers.find((e) => e.id === job.employerId)
  return {
    ...job,
    company: employer?.companyName || "Unknown employer",
    contactPerson: employer?.contactPerson || "",
    contactEmail: employer?.email || "",
    applicants: db.applications.filter((a) => a.jobId === job.id).length,
  }
}

export function workerSummary(worker: Worker) {
  return {
    id: worker.id,
    name: worker.name,
    age: ageFromDob(worker.dob),
    location: worker.location,
    phone: worker.phone,
    skills: worker.skills,
    education: worker.education,
    languages: worker.languages,
    employmentHistory: worker.employmentHistory,
    photo: worker.photo,
  }
}

export function applicationView(db: Database, app: Application) {
  const job = db.jobs.find((j) => j.id === app.jobId)
  const worker = db.workers.find((w) => w.id === app.workerId)
  return {
    ...app,
    job: job ? jobView(db, job) : null,
    worker: worker ? workerSummary(worker) : null,
  }
}

export function grievanceView(db: Database, g: Grievance) {
  const worker = db.workers.find((w) => w.id === g.workerId)
  return {
    ...g,
    workerName: worker?.name || "Unknown worker",
    workerLocation: worker?.location || "",
  }
}

/** Annual income used for eligibility: profile value, else last 12 months of recorded wages. */
export function estimatedAnnualIncome(db: Database, worker: Worker): number | null {
  if (typeof worker.annualIncome === "number" && worker.annualIncome > 0) return worker.annualIncome
  const since = Date.now() - 365 * 24 * 60 * 60 * 1000
  const wages = db.wages.filter((w) => w.workerId === worker.id && new Date(w.createdAt).getTime() >= since)
  if (wages.length === 0) return null
  return wages.reduce((sum, w) => sum + w.amount, 0)
}

export function evaluateEligibility(db: Database, worker: Worker, scheme: WelfareScheme) {
  const reasons: string[] = []
  const missing: string[] = []
  const r = scheme.rules
  const age = ageFromDob(worker.dob)

  if (r.minAge != null || r.maxAge != null) {
    if (age == null) missing.push("date of birth")
    else {
      if (r.minAge != null && age < r.minAge) reasons.push(`Minimum age is ${r.minAge} (you are ${age})`)
      if (r.maxAge != null && age > r.maxAge) reasons.push(`Maximum age is ${r.maxAge} (you are ${age})`)
    }
  }
  if (r.maxAnnualIncome != null) {
    const income = estimatedAnnualIncome(db, worker)
    if (income == null) missing.push("annual income")
    else if (income > r.maxAnnualIncome)
      reasons.push(
        `Annual income must be at most ₹${r.maxAnnualIncome.toLocaleString("en-IN")} (yours: ₹${income.toLocaleString("en-IN")})`,
      )
  }
  if (r.requiresBankAccount && !worker.hasBankAccount) reasons.push("A savings bank account is required")
  if (r.anySkill && !r.anySkill.some((s) => worker.skills.includes(s)))
    reasons.push(`Requires one of these occupations: ${r.anySkill.join(", ")}`)

  const eligible = reasons.length === 0 && missing.length === 0
  let message: string
  if (eligible) message = "Based on your profile, you meet the eligibility criteria for this scheme. You can apply now."
  else if (reasons.length) message = `You may not be eligible: ${reasons.join("; ")}.`
  else message = `Please add your ${missing.join(" and ")} in My Profile so eligibility can be checked.`

  return { eligible, reasons, missing, message }
}

/** Skill-overlap score used for job recommendations and "similar jobs". */
export function matchScore(skills: string[], job: Job, workerLocation?: string) {
  const overlap = job.skills.filter((s) => skills.includes(s)).length
  return overlap * 10 + (workerLocation && job.location === workerLocation ? 3 : 0)
}
