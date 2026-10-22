import type { Role } from "@/lib/types"
import { readDb } from "@/lib/server/db"
import {
  DEMO_MODE,
  HttpError,
  deliverOtp,
  findUserByIdentifier,
  handle,
  issueOtp,
  json,
  otpKey,
  readBody,
  str,
} from "@/lib/server/auth"
import { identifierKind, isValidAadhaar, isValidPhone, normalizeId } from "@/lib/validation"

// POST /api/auth/otp  { role, identifier, purpose: "login" | "register", phone? }
export function POST(req: Request) {
  return handle(async () => {
    const body = await readBody<{ role?: Role; identifier?: string; purpose?: string; phone?: string }>(req)
    const role: Role = body.role === "employer" ? "employer" : "worker"
    const purpose = body.purpose === "register" ? "register" : "login"
    const identifier = normalizeId(str(body.identifier, "Aadhaar/GST number", { max: 20 }))

    if (role === "worker" && !isValidAadhaar(identifier)) {
      throw new HttpError(400, "Enter a valid 12-digit Aadhaar number (checksum failed)")
    }
    if (role === "employer" && !identifierKind(identifier)) {
      throw new HttpError(400, "Enter a valid 12-digit Aadhaar or 15-character GSTIN")
    }

    const db = readDb()
    const existing = findUserByIdentifier(db, role, identifier)
    let phone: string | undefined
    if (purpose === "login") {
      if (!existing) throw new HttpError(404, "No account found for this number. Please register first.")
      phone = existing.phone
    } else {
      if (existing) throw new HttpError(409, "An account already exists for this number. Please log in.")
      if (body.phone && isValidPhone(body.phone)) phone = body.phone
    }

    const code = issueOtp(otpKey(role, purpose, identifier))
    const { delivered } = await deliverOtp(phone, code)
    if (!delivered && !DEMO_MODE) throw new HttpError(502, "Could not send OTP. Please try again later.")

    const maskedPhone = phone ? `XXXXXX${phone.replace(/\D/g, "").slice(-4)}` : null
    return json({
      sent: true,
      maskedPhone,
      // Only exposed when no SMS gateway delivered the code and demo mode is on.
      demoOtp: !delivered && DEMO_MODE ? code : undefined,
      demoFixedOtp: DEMO_MODE && isValidAadhaar(identifier) && identifier === "123412341234" ? "1234" : undefined,
    })
  })
}
