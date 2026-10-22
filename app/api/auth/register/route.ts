import type { Employer, EmploymentHistoryItem, Role, Worker } from "@/lib/types"
import { mutate, nextId, nowIso } from "@/lib/server/db"
import {
  HttpError,
  consumeVerificationToken,
  createSession,
  findUserByIdentifier,
  handle,
  json,
  otpKey,
  publicUser,
  readBody,
  str,
  strList,
} from "@/lib/server/auth"
import { isValidEmail, isValidPhone, normalizeId } from "@/lib/validation"

// POST /api/auth/register { role, identifier, verificationToken, ...profile }
export function POST(req: Request) {
  return handle(async () => {
    const body = await readBody<Record<string, unknown>>(req)
    const role: Role = body.role === "employer" ? "employer" : "worker"
    const identifier = normalizeId(str(body.identifier, "Aadhaar/GST number", { max: 20 }))
    const token = str(body.verificationToken, "Aadhaar verification")

    const phone = str(body.phone, "Phone number", { max: 15 })
    if (!isValidPhone(phone)) throw new HttpError(400, "Enter a valid 10-digit Indian mobile number")

    let worker: Worker | undefined
    let employer: Employer | undefined
    if (role === "worker") {
      const dob = str(body.dob, "Date of birth", { max: 10 })
      if (Number.isNaN(new Date(dob).getTime()) || new Date(dob) > new Date()) throw new HttpError(400, "Invalid date of birth")
      const history = Array.isArray(body.employmentHistory)
        ? (body.employmentHistory as EmploymentHistoryItem[])
            .filter((h) => h && (h.employer || h.role))
            .map((h) => ({
              employer: String(h.employer || "").slice(0, 200),
              role: String(h.role || "").slice(0, 200),
              duration: String(h.duration || "").slice(0, 100),
              location: String(h.location || "").slice(0, 100),
            }))
        : []
      worker = {
        id: "",
        role: "worker",
        aadhaar: identifier,
        name: str(body.name, "Full name", { max: 120 }),
        dob,
        phone,
        address: str(body.address, "Address", { max: 500 }),
        location: str(body.location, "Current city/district", { required: false, max: 100 }),
        skills: strList(body.skills),
        employmentHistory: history,
        education: "",
        languages: [],
        hasBankAccount: false,
        createdAt: nowIso(),
      }
      if (worker.skills.length === 0) throw new HttpError(400, "Select at least one skill")
    } else {
      const email = str(body.email, "Email", { max: 200 })
      if (!isValidEmail(email)) throw new HttpError(400, "Enter a valid email address")
      employer = {
        id: "",
        role: "employer",
        aadhaarGst: identifier,
        companyName: str(body.companyName, "Company name", { max: 200 }),
        contactPerson: str(body.contactPerson, "Contact person", { max: 120 }),
        email,
        phone,
        address: str(body.address, "Address", { required: false, max: 500 }),
        location: str(body.location, "Location", { required: false, max: 100 }),
        website: "",
        description: "",
        industry: str(body.industry, "Industry", { required: false, max: 100 }),
        employeeCount: "",
        yearEstablished: "",
        createdAt: nowIso(),
      }
    }

    if (!consumeVerificationToken(otpKey(role, "register", identifier), token)) {
      throw new HttpError(400, "Aadhaar/GST verification expired. Please verify again.")
    }

    const user = mutate((db) => {
      if (findUserByIdentifier(db, role, identifier)) throw new HttpError(409, "An account already exists for this number")
      if (worker) {
        worker.id = nextId(db, "worker", "MIG")
        db.workers.push(worker)
        return worker
      }
      employer!.id = nextId(db, "employer", "EMP")
      db.employers.push(employer!)
      return employer!
    })

    await createSession(user.id, role)
    return json({ user: publicUser(user) }, 201)
  })
}
