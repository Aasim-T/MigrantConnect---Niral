import type { Employer, Worker } from "@/lib/types"
import { mutate } from "@/lib/server/db"
import { HttpError, handle, json, publicUser, readBody, requireUser, str, strList } from "@/lib/server/auth"
import { isValidEmail, isValidPhone } from "@/lib/validation"

const MAX_IMAGE = 1_500_000 // ~1.1 MB binary as data URL

function image(value: unknown): string | undefined {
  if (value == null || value === "") return undefined
  if (typeof value !== "string" || !/^data:image\/(png|jpe?g|webp|gif);base64,/.test(value)) {
    throw new HttpError(400, "Image must be a PNG, JPEG, WebP or GIF file")
  }
  if (value.length > MAX_IMAGE) throw new HttpError(400, "Image is too large (max 1 MB)")
  return value
}

// PUT /api/profile — update the logged-in user's own profile.
export function PUT(req: Request) {
  return handle(async () => {
    const user = await requireUser()
    const body = await readBody<Record<string, unknown>>(req)

    const updated = mutate((db) => {
      if (user.role === "worker") {
        const w = db.workers.find((x) => x.id === user.id) as Worker
        if (body.name !== undefined) w.name = str(body.name, "Full name", { max: 120 })
        if (body.dob !== undefined) {
          const dob = str(body.dob, "Date of birth", { max: 10 })
          if (Number.isNaN(new Date(dob).getTime()) || new Date(dob) > new Date()) throw new HttpError(400, "Invalid date of birth")
          w.dob = dob
        }
        if (body.phone !== undefined) {
          const phone = str(body.phone, "Phone number", { max: 15 })
          if (!isValidPhone(phone)) throw new HttpError(400, "Enter a valid 10-digit Indian mobile number")
          w.phone = phone
        }
        if (body.address !== undefined) w.address = str(body.address, "Address", { required: false, max: 500 })
        if (body.location !== undefined) w.location = str(body.location, "Location", { required: false, max: 100 })
        if (body.education !== undefined) w.education = str(body.education, "Education", { required: false, max: 200 })
        if (body.skills !== undefined) w.skills = Array.from(new Set(strList(body.skills, 40)))
        if (body.languages !== undefined) w.languages = Array.from(new Set(strList(body.languages, 20)))
        if (body.employmentHistory !== undefined && Array.isArray(body.employmentHistory)) {
          w.employmentHistory = (body.employmentHistory as Record<string, unknown>[])
            .filter((h) => h && (h.employer || h.role))
            .slice(0, 30)
            .map((h) => ({
              employer: String(h.employer || "").slice(0, 200),
              role: String(h.role || "").slice(0, 200),
              duration: String(h.duration || "").slice(0, 100),
              location: String(h.location || "").slice(0, 100),
            }))
        }
        if (body.annualIncome !== undefined) {
          const n = Number(body.annualIncome)
          if (body.annualIncome === "" || body.annualIncome === null) w.annualIncome = undefined
          else if (!Number.isFinite(n) || n < 0) throw new HttpError(400, "Annual income must be a positive number")
          else w.annualIncome = Math.round(n)
        }
        if (body.hasBankAccount !== undefined) w.hasBankAccount = Boolean(body.hasBankAccount)
        if (body.photo !== undefined) w.photo = image(body.photo)
        return w
      }

      const e = db.employers.find((x) => x.id === user.id) as Employer
      if (body.companyName !== undefined) e.companyName = str(body.companyName, "Company name", { max: 200 })
      if (body.contactPerson !== undefined) e.contactPerson = str(body.contactPerson, "Contact person", { max: 120 })
      if (body.email !== undefined) {
        const email = str(body.email, "Email", { max: 200 })
        if (!isValidEmail(email)) throw new HttpError(400, "Enter a valid email address")
        e.email = email
      }
      if (body.phone !== undefined) {
        const phone = str(body.phone, "Phone number", { max: 15 })
        if (!isValidPhone(phone)) throw new HttpError(400, "Enter a valid 10-digit Indian mobile number")
        e.phone = phone
      }
      for (const f of ["address", "location", "website", "description", "industry", "employeeCount", "yearEstablished"] as const) {
        if (body[f] !== undefined) e[f] = str(body[f], f, { required: false, max: f === "description" ? 3000 : 300 })
      }
      if (e.yearEstablished && !/^(18|19|20)\d{2}$/.test(e.yearEstablished)) throw new HttpError(400, "Year established must be a 4-digit year")
      if (body.logo !== undefined) e.logo = image(body.logo)
      return e
    })

    return json({ user: publicUser(updated) })
  })
}
