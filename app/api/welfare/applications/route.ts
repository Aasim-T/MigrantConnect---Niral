import type { UploadedDocument } from "@/lib/types"
import { mutate, nextId, notify, nowIso, readDb } from "@/lib/server/db"
import { HttpError, handle, json, readBody, requireWorker, str } from "@/lib/server/auth"
import { evaluateEligibility } from "@/lib/server/views"
import { isValidAadhaar, isValidPhone, normalizeId } from "@/lib/validation"

export const dynamic = "force-dynamic"

const MAX_DOC = 2_800_000 // ~2 MB file as data URL
const DOC_TYPES = /^data:(image\/(png|jpe?g|webp)|application\/pdf);base64,/

// GET /api/welfare/applications — the worker's welfare applications (without file contents)
export function GET() {
  return handle(async () => {
    const worker = await requireWorker()
    const db = readDb()
    const applications = db.welfareApplications
      .filter((a) => a.workerId === worker.id)
      .map(({ documents, ...a }) => ({
        ...a,
        schemeName: db.schemes.find((s) => s.id === a.schemeId)?.name || a.schemeId,
        documents: documents.map(({ dataUrl: _d, ...d }) => d),
      }))
    return json({ applications })
  })
}

// POST /api/welfare/applications — apply for a scheme with supporting documents
export function POST(req: Request) {
  return handle(async () => {
    const worker = await requireWorker()
    const body = await readBody<Record<string, unknown>>(req)
    const schemeId = str(body.schemeId, "Scheme")
    const aadhaarNumber = normalizeId(str(body.aadhaarNumber, "Aadhaar number", { max: 20 }))
    if (!isValidAadhaar(aadhaarNumber)) throw new HttpError(400, "Enter a valid 12-digit Aadhaar number")
    const phoneNumber = str(body.phoneNumber, "Phone number", { max: 15 })
    if (!isValidPhone(phoneNumber)) throw new HttpError(400, "Enter a valid 10-digit Indian mobile number")
    const ifscCode = str(body.ifscCode, "IFSC code", { required: false, max: 11 }).toUpperCase()
    if (ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) throw new HttpError(400, "Enter a valid 11-character IFSC code")
    const bankAccount = str(body.bankAccount, "Bank account", { required: false, max: 20 })
    if (bankAccount && !/^\d{9,18}$/.test(bankAccount)) throw new HttpError(400, "Bank account number must be 9-18 digits")
    const income = Number(body.annualIncome)
    if (!Number.isFinite(income) || income < 0) throw new HttpError(400, "Annual income must be a positive number")

    const documents: UploadedDocument[] = (Array.isArray(body.documents) ? body.documents : []).slice(0, 10).map((d: any) => {
      const dataUrl = String(d?.dataUrl || "")
      if (!DOC_TYPES.test(dataUrl)) throw new HttpError(400, "Documents must be PDF, PNG, JPEG or WebP files")
      if (dataUrl.length > MAX_DOC) throw new HttpError(400, `${d?.fileName || "A document"} is larger than 2 MB`)
      return {
        name: String(d?.name || "Document").slice(0, 100),
        fileName: String(d?.fileName || "file").slice(0, 200),
        size: Number(d?.size) || 0,
        type: String(d?.type || "").slice(0, 100),
        dataUrl,
      }
    })

    const application = mutate((db) => {
      const scheme = db.schemes.find((s) => s.id === schemeId)
      if (!scheme) throw new HttpError(404, "Scheme not found")
      if (db.welfareApplications.some((a) => a.schemeId === schemeId && a.workerId === worker.id && a.status !== "Rejected")) {
        throw new HttpError(409, "You have already applied for this scheme")
      }
      const missingDocs = scheme.documents.filter((name) => !documents.some((d) => d.name === name))
      if (missingDocs.length) throw new HttpError(400, `Please upload: ${missingDocs.join(", ")}`)

      const n = nextId(db, "welfare", "WEL")
      const app = {
        id: n,
        reference: `TN-${scheme.id.replace("SCH-", "")}-${new Date().getFullYear()}-${n.split("-")[1].padStart(5, "0")}`,
        schemeId,
        workerId: worker.id,
        fullName: str(body.fullName, "Full name", { max: 120 }),
        aadhaarNumber: `XXXXXXXX${aadhaarNumber.slice(-4)}`,
        address: str(body.address, "Address", { max: 500 }),
        phoneNumber,
        bankAccount: bankAccount ? `XXXX${bankAccount.slice(-4)}` : "",
        ifscCode,
        annualIncome: Math.round(income),
        note: str(body.note, "Note", { required: false, max: 1000 }),
        documents,
        status: "Submitted" as const,
        submittedAt: nowIso(),
      }
      db.welfareApplications.push(app)
      const w = db.workers.find((x) => x.id === worker.id)!
      if (bankAccount) w.hasBankAccount = true
      if (!w.annualIncome) w.annualIncome = Math.round(income)
      const check = evaluateEligibility(db, w, scheme)
      notify(db, worker.id, "welfare", "Welfare Application Submitted", `Your application for ${scheme.name} (ref ${app.reference}) was submitted${check.eligible ? "" : " for review"}.`, "/welfare")
      const { documents: _docs, ...rest } = app
      return { ...rest, documentCount: documents.length, schemeName: scheme.name }
    })
    return json({ application }, 201)
  })
}
