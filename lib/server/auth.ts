import crypto from "node:crypto"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { Database, Employer, Role, User, Worker } from "@/lib/types"
import { DEMO_AADHAAR, normalizeId } from "@/lib/validation"
import { mutate, readDb } from "./db"

export const SESSION_COOKIE = "mc_session"
export const ROLE_COOKIE = "mc_role"
const SESSION_DAYS = 7
const OTP_TTL_MS = 10 * 60 * 1000
const OTP_MAX_ATTEMPTS = 5

/** Demo mode shows the OTP on screen instead of requiring an SMS gateway. On by default. */
export const DEMO_MODE = process.env.MC_DEMO_MODE !== "false"

// ---------------------------------------------------------------------------
// Errors / responses
// ---------------------------------------------------------------------------
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

export function handle(fn: () => Promise<Response> | Response) {
  return Promise.resolve()
    .then(fn)
    .catch((err: unknown) => {
      if (err instanceof HttpError) return json({ error: err.message }, err.status)
      console.error("[api]", err)
      return json({ error: "Internal server error" }, 500)
    })
}

export async function readBody<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T
  } catch {
    throw new HttpError(400, "Invalid JSON body")
  }
}

export function str(value: unknown, field: string, { required = true, max = 2000 } = {}): string {
  const v = typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim()
  if (required && !v) throw new HttpError(400, `${field} is required`)
  if (v.length > max) throw new HttpError(400, `${field} is too long`)
  return v
}

export function strList(value: unknown, max = 30): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean)
    .slice(0, max)
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
export function findUserByIdentifier(db: Database, role: Role, identifier: string): User | undefined {
  const id = normalizeId(identifier)
  if (role === "worker") return db.workers.find((w) => normalizeId(w.aadhaar) === id)
  return db.employers.find(
    (e) => normalizeId(e.aadhaarGst) === id || (e.contactAadhaar && normalizeId(e.contactAadhaar) === id),
  )
}

export function findUser(db: Database, id: string): User | undefined {
  return db.workers.find((w) => w.id === id) || db.employers.find((e) => e.id === id)
}

/** Strip fields that should never leave the server. */
export function publicUser(user: User) {
  if (user.role === "worker") {
    const { aadhaar, ...rest } = user
    return { ...rest, aadhaarMasked: `XXXX XXXX ${normalizeId(aadhaar).slice(-4)}` }
  }
  return user
}

// ---------------------------------------------------------------------------
// OTP
// ---------------------------------------------------------------------------
function hash(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex")
}

export function otpKey(role: Role, purpose: string, identifier: string) {
  return `${role}:${purpose}:${normalizeId(identifier)}`
}

/** Create an OTP; returns the plain code so the caller can deliver it. */
export function issueOtp(key: string): string {
  const code = String(crypto.randomInt(100000, 1000000))
  mutate((db) => {
    db.otps = db.otps.filter((o) => o.key !== key && new Date(o.expiresAt).getTime() > Date.now())
    db.otps.push({
      key,
      codeHash: hash(code),
      expiresAt: new Date(Date.now() + OTP_TTL_MS).toISOString(),
      attempts: 0,
      verified: false,
    })
  })
  return code
}

/**
 * Verify an OTP. The seeded demo identity (Aadhaar 1234 1234 1234) also accepts
 * the fixed demo code 1234 while demo mode is on.
 */
export function checkOtp(key: string, code: string, identifier: string): boolean {
  if (DEMO_MODE && normalizeId(identifier) === DEMO_AADHAAR && code === "1234") return true
  return mutate((db) => {
    const rec = db.otps.find((o) => o.key === key)
    if (!rec) throw new HttpError(400, "No OTP requested or it has expired. Please request a new OTP.")
    if (new Date(rec.expiresAt).getTime() < Date.now()) {
      db.otps = db.otps.filter((o) => o !== rec)
      throw new HttpError(400, "OTP expired. Please request a new OTP.")
    }
    if (rec.attempts >= OTP_MAX_ATTEMPTS) throw new HttpError(429, "Too many attempts. Please request a new OTP.")
    rec.attempts += 1
    if (rec.codeHash !== hash(code)) return false
    db.otps = db.otps.filter((o) => o !== rec)
    return true
  })
}

/**
 * Deliver an OTP. If SMS_WEBHOOK_URL is configured, the message is POSTed there
 * as JSON ({ to, message }) so any SMS gateway can be plugged in. In demo mode
 * the code is also returned to the client so the app works fully offline.
 */
export async function deliverOtp(phone: string | undefined, code: string): Promise<{ delivered: boolean }> {
  const url = process.env.SMS_WEBHOOK_URL
  if (url && phone) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.SMS_WEBHOOK_TOKEN ? { Authorization: `Bearer ${process.env.SMS_WEBHOOK_TOKEN}` } : {}),
        },
        body: JSON.stringify({ to: phone, message: `Your MigrantConnect OTP is ${code}. Valid for 10 minutes.` }),
      })
      return { delivered: res.ok }
    } catch (err) {
      console.error("[otp] SMS webhook failed", err)
      return { delivered: false }
    }
  }
  if (DEMO_MODE) console.info(`[otp] demo OTP for ${phone || "unknown phone"}: ${code}`)
  return { delivered: false }
}

/** One-time token proving that an identifier was OTP-verified (used by registration). */
export function issueVerificationToken(key: string): string {
  const token = crypto.randomBytes(24).toString("hex")
  mutate((db) => {
    db.otps.push({
      key: `verified:${key}`,
      codeHash: hash(token),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      attempts: 0,
      verified: true,
    })
  })
  return token
}

export function consumeVerificationToken(key: string, token: string): boolean {
  return mutate((db) => {
    const rec = db.otps.find(
      (o) => o.key === `verified:${key}` && o.codeHash === hash(token) && new Date(o.expiresAt).getTime() > Date.now(),
    )
    if (!rec) return false
    db.otps = db.otps.filter((o) => o !== rec)
    return true
  })
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------
export async function createSession(userId: string, role: Role) {
  const token = crypto.randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
  mutate((db) => {
    db.sessions = db.sessions.filter((s) => new Date(s.expiresAt).getTime() > Date.now())
    db.sessions.push({ token, userId, role, expiresAt: expiresAt.toISOString() })
  })
  const jar = await cookies()
  const opts = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production" && process.env.MC_INSECURE_COOKIES !== "true",
    path: "/",
    expires: expiresAt,
  }
  jar.set(SESSION_COOKIE, token, opts)
  jar.set(ROLE_COOKIE, role, { ...opts, httpOnly: false })
}

export async function destroySession() {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value
  if (token) mutate((db) => void (db.sessions = db.sessions.filter((s) => s.token !== token)))
  jar.delete(SESSION_COOKIE)
  jar.delete(ROLE_COOKIE)
}

export async function currentUser(): Promise<User | null> {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value
  if (!token) return null
  const db = readDb()
  const session = db.sessions.find((s) => s.token === token)
  if (!session || new Date(session.expiresAt).getTime() < Date.now()) return null
  return findUser(db, session.userId) || null
}

export async function requireUser(): Promise<User> {
  const user = await currentUser()
  if (!user) throw new HttpError(401, "Please log in")
  return user
}

export async function requireWorker(): Promise<Worker> {
  const user = await requireUser()
  if (user.role !== "worker") throw new HttpError(403, "Only workers can do this")
  return user
}

export async function requireEmployer(): Promise<Employer> {
  const user = await requireUser()
  if (user.role !== "employer") throw new HttpError(403, "Only employers can do this")
  return user
}
