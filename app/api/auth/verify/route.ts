import type { Role } from "@/lib/types"
import { readDb } from "@/lib/server/db"
import {
  HttpError,
  checkOtp,
  createSession,
  findUserByIdentifier,
  handle,
  issueVerificationToken,
  json,
  otpKey,
  publicUser,
  readBody,
  str,
} from "@/lib/server/auth"
import { normalizeId } from "@/lib/validation"

// POST /api/auth/verify { role, identifier, otp, purpose }
// login    -> creates a session and returns the user
// register -> returns a one-time verificationToken for /api/auth/register
export function POST(req: Request) {
  return handle(async () => {
    const body = await readBody<{ role?: Role; identifier?: string; otp?: string; purpose?: string }>(req)
    const role: Role = body.role === "employer" ? "employer" : "worker"
    const purpose = body.purpose === "register" ? "register" : "login"
    const identifier = normalizeId(str(body.identifier, "Aadhaar/GST number", { max: 20 }))
    const otp = str(body.otp, "OTP", { max: 6 })

    const key = otpKey(role, purpose, identifier)
    if (!checkOtp(key, otp, identifier)) throw new HttpError(400, "Incorrect OTP")

    if (purpose === "register") {
      return json({ verified: true, verificationToken: issueVerificationToken(key) })
    }

    const user = findUserByIdentifier(readDb(), role, identifier)
    if (!user) throw new HttpError(404, "No account found for this number")
    await createSession(user.id, role)
    return json({ verified: true, user: publicUser(user) })
  })
}
