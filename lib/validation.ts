// Shared (client + server) validation helpers for MigrantConnect.

// ---------------------------------------------------------------------------
// Aadhaar: 12 digits, cannot start with 0 or 1, last digit is a Verhoeff
// checksum (the algorithm UIDAI uses for Aadhaar numbers).
// ---------------------------------------------------------------------------
const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
]
const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
]
const VERHOEFF_INV = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9]

export function verhoeffValid(num: string): boolean {
  let c = 0
  const digits = num.split("").reverse().map(Number)
  for (let i = 0; i < digits.length; i++) {
    c = VERHOEFF_D[c][VERHOEFF_P[i % 8][digits[i]]]
  }
  return c === 0
}

export function verhoeffCheckDigit(num: string): number {
  let c = 0
  const digits = num.split("").reverse().map(Number)
  for (let i = 0; i < digits.length; i++) {
    c = VERHOEFF_D[c][VERHOEFF_P[(i + 1) % 8][digits[i]]]
  }
  return VERHOEFF_INV[c]
}

/** Identifiers that are accepted without checksum validation (seeded demo accounts). */
export const DEMO_AADHAAR = "123412341234"

export function normalizeId(value: string): string {
  return value.replace(/[\s-]/g, "").toUpperCase()
}

export function isValidAadhaar(value: string): boolean {
  const v = normalizeId(value)
  if (v === DEMO_AADHAAR) return true
  return /^[2-9]\d{11}$/.test(v) && verhoeffValid(v)
}

// ---------------------------------------------------------------------------
// GSTIN: 15 chars = 2-digit state code + PAN (10) + entity no + 'Z' + check char.
// The check character uses the official mod-36 algorithm.
// ---------------------------------------------------------------------------
const GST_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"

export function gstCheckChar(first14: string): string {
  let sum = 0
  for (let i = 0; i < 14; i++) {
    const value = GST_CHARS.indexOf(first14[i]) * (i % 2 === 0 ? 1 : 2)
    sum += Math.floor(value / 36) + (value % 36)
  }
  return GST_CHARS[(36 - (sum % 36)) % 36]
}

export function isValidGstin(value: string): boolean {
  const v = normalizeId(value)
  if (!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v)) return false
  return gstCheckChar(v.slice(0, 14)) === v[14]
}

export function identifierKind(value: string): "aadhaar" | "gstin" | null {
  if (isValidAadhaar(value)) return "aadhaar"
  if (isValidGstin(value)) return "gstin"
  return null
}

export function isValidPhone(value: string): boolean {
  return /^(\+?91)?[6-9]\d{9}$/.test(value.replace(/[\s-]/g, ""))
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function isValidIfsc(value: string): boolean {
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(value.toUpperCase())
}

export function maskAadhaar(value: string): string {
  const v = normalizeId(value)
  if (/^\d{12}$/.test(v)) return `XXXX XXXX ${v.slice(-4)}`
  return v
}

export const SKILLS = [
  "Construction",
  "Plumbing",
  "Electrical",
  "Carpentry",
  "Painting",
  "Masonry",
  "Welding",
  "Driving",
  "Cooking",
  "Cleaning",
  "Agriculture",
  "Physical Labor",
  "Tailoring",
  "Machine Operation",
]

export const GRIEVANCE_TYPES = [
  "Wage Dispute",
  "Safety Concern",
  "Harassment",
  "Job Termination",
  "Working Hours",
  "Living Conditions",
  "Other",
]
