import type { Job } from "@/lib/types"
import { HttpError, str, strList } from "./auth"

const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Temporary"]
const DURATIONS = ["Short-term", "Long-term", "Project-based", "Permanent"]

/** Validate a job form payload (create or full edit). */
export function parseJobInput(body: Record<string, unknown>) {
  const salaryMin = Number(body.salaryMin)
  const salaryMax = Number(body.salaryMax)
  if (!Number.isFinite(salaryMin) || salaryMin <= 0) throw new HttpError(400, "Minimum salary must be a positive number")
  if (!Number.isFinite(salaryMax) || salaryMax <= 0) throw new HttpError(400, "Maximum salary must be a positive number")
  if (salaryMax < salaryMin) throw new HttpError(400, "Maximum salary cannot be less than minimum salary")

  const type = str(body.type, "Job type", { max: 40 })
  if (!JOB_TYPES.includes(type)) throw new HttpError(400, "Select a valid job type")
  const duration = str(body.duration, "Duration", { required: false, max: 40 })
  if (duration && !DURATIONS.includes(duration)) throw new HttpError(400, "Select a valid duration")

  const skills = strList(body.skills)
  if (skills.length === 0) throw new HttpError(400, "Select at least one required skill")

  const deadlineDays = Number(body.deadlineDays ?? 30)
  const days = Number.isFinite(deadlineDays) && deadlineDays > 0 && deadlineDays <= 180 ? deadlineDays : 30

  const fields: Omit<Job, "id" | "employerId" | "status" | "postedAt" | "deadline"> = {
    title: str(body.title, "Job title", { max: 120 }),
    description: str(body.description, "Job description", { max: 4000 }),
    location: str(body.location, "Location", { max: 100 }),
    salaryMin: Math.round(salaryMin),
    salaryMax: Math.round(salaryMax),
    type,
    duration: duration || "Long-term",
    workingHours: str(body.workingHours, "Working hours", { required: false, max: 100 }),
    skills,
    responsibilities: strList(body.responsibilities),
    requirements: strList(body.requirements),
    benefits: strList(body.benefits),
  }
  return { fields, deadline: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString() }
}
