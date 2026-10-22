"use client"

import { Suspense, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, Loader2, Plus, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { api } from "@/lib/api"
import { SKILLS, identifierKind, isValidAadhaar, isValidPhone, verhoeffCheckDigit } from "@/lib/validation"

type Role = "worker" | "employer"

/** A random Aadhaar-format number with a valid Verhoeff checksum, for demos. */
function testAadhaar() {
  const first11 = String(2 + Math.floor(Math.random() * 8)) + Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join("")
  return first11 + verhoeffCheckDigit(first11)
}

/** Aadhaar/GSTIN field with OTP verification. Calls onVerified with the one-time registration token. */
function IdentityVerification({
  role,
  identifier,
  setIdentifier,
  phone,
  token,
  onVerified,
}: {
  role: Role
  identifier: string
  setIdentifier: (v: string) => void
  phone: string
  token: string | null
  onVerified: (token: string | null) => void
}) {
  const [otp, setOtp] = useState("")
  const [sent, setSent] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const valid = role === "worker" ? isValidAadhaar(identifier) : Boolean(identifierKind(identifier))

  const send = async () => {
    setBusy(true)
    setError(null)
    try {
      const r = await api<{ maskedPhone: string | null; demoOtp?: string }>("/api/auth/otp", {
        body: { role, identifier, purpose: "register", phone: isValidPhone(phone) ? phone : undefined },
      })
      setSent(true)
      setHint(
        `${r.maskedPhone ? `OTP sent to ${r.maskedPhone}.` : "OTP generated."}${r.demoOtp ? ` Demo mode: your OTP is ${r.demoOtp}.` : ""}`,
      )
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const verify = async () => {
    setBusy(true)
    setError(null)
    try {
      const r = await api<{ verificationToken: string }>("/api/auth/verify", {
        body: { role, identifier, otp, purpose: "register" },
      })
      onVerified(r.verificationToken)
      setHint(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2 rounded-md border p-3">
      <Label htmlFor={`identifier-${role}`}>{role === "worker" ? "Aadhaar Number" : "GSTIN or Aadhaar Number"}</Label>
      <div className="flex gap-2">
        <Input
          id={`identifier-${role}`}
          placeholder={role === "worker" ? "XXXX XXXX XXXX" : "15-character GSTIN or 12-digit Aadhaar"}
          value={identifier}
          onChange={(e) => {
            setIdentifier(e.target.value)
            setSent(false)
            onVerified(null)
          }}
          className={token ? "border-green-500" : ""}
          disabled={Boolean(token)}
        />
        {token ? (
          <span className="flex items-center gap-1 text-sm font-medium text-green-600">
            <CheckCircle2 className="h-4 w-4" /> Verified
          </span>
        ) : (
          <Button type="button" onClick={send} disabled={busy || !valid} variant={sent ? "outline" : "default"}>
            {sent ? "Resend" : "Send OTP"}
          </Button>
        )}
      </div>
      {!token && identifier.replace(/\s/g, "").length >= 12 && !valid && (
        <p className="text-xs text-red-600">
          {role === "worker" ? "This is not a valid Aadhaar number (checksum failed)." : "Enter a valid GSTIN or Aadhaar number."}
        </p>
      )}
      {role === "worker" && !token && (
        <button type="button" className="text-xs text-muted-foreground underline" onClick={() => setIdentifier(testAadhaar())}>
          Demo: fill a test Aadhaar number
        </button>
      )}
      {sent && !token && (
        <div className="flex gap-2">
          <Input
            placeholder="Enter 6-digit OTP"
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
          />
          <Button type="button" onClick={verify} disabled={busy || otp.length !== 6}>
            Verify
          </Button>
        </div>
      )}
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}

function WorkerForm() {
  const router = useRouter()
  const [form, setForm] = useState({
    aadhaar: "",
    name: "",
    dob: "",
    phone: "",
    address: "",
    location: "",
    skills: [] as string[],
    employmentHistory: [{ employer: "", duration: "", role: "" }],
  })
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }))

  const updateHistory = (i: number, field: string, value: string) =>
    set({ employmentHistory: form.employmentHistory.map((h, j) => (j === i ? { ...h, [field]: value } : h)) })

  const submit = async () => {
    setError(null)
    if (!token) return setError("Verify your Aadhaar number first.")
    if (!form.name.trim()) return setError("Enter your full name.")
    if (!form.dob) return setError("Enter your date of birth.")
    if (!isValidPhone(form.phone)) return setError("Enter a valid 10-digit mobile number.")
    if (!form.address.trim()) return setError("Enter your address.")
    if (form.skills.length === 0) return setError("Select at least one skill.")
    setBusy(true)
    try {
      await api("/api/auth/register", {
        body: { role: "worker", identifier: form.aadhaar, verificationToken: token, ...form },
      })
      router.replace("/dashboard")
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Worker Registration</CardTitle>
        <CardDescription>Enter your details to register as a migrant worker</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Mobile Number (Aadhaar-linked)</Label>
          <Input id="phone" placeholder="10-digit mobile number" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
        </div>
        <IdentityVerification
          role="worker"
          identifier={form.aadhaar}
          setIdentifier={(aadhaar) => set({ aadhaar })}
          phone={form.phone}
          token={token}
          onVerified={setToken}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" placeholder="Enter your full name" value={form.name} onChange={(e) => set({ name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dob">Date of Birth</Label>
            <Input id="dob" type="date" value={form.dob} onChange={(e) => set({ dob: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" placeholder="Current address" value={form.address} onChange={(e) => set({ address: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Current City / District</Label>
            <Input id="location" placeholder="e.g. Chennai" value={form.location} onChange={(e) => set({ location: e.target.value })} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Skills</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {SKILLS.map((skill) => (
              <Button
                key={skill}
                type="button"
                variant={form.skills.includes(skill) ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  set({ skills: form.skills.includes(skill) ? form.skills.filter((s) => s !== skill) : [...form.skills, skill] })
                }
                className="justify-start"
              >
                {skill}
              </Button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Employment History (optional)</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => set({ employmentHistory: [...form.employmentHistory, { employer: "", duration: "", role: "" }] })}
              className="flex items-center gap-1"
            >
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
          {form.employmentHistory.map((job, index) => (
            <div key={index} className="border rounded-md p-3 space-y-3 relative">
              {index > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 h-6 w-6"
                  onClick={() => set({ employmentHistory: form.employmentHistory.filter((_, j) => j !== index) })}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              <div className="space-y-2">
                <Label htmlFor={`employer-${index}`}>Employer Name</Label>
                <Input
                  id={`employer-${index}`}
                  placeholder="Previous employer name"
                  value={job.employer}
                  onChange={(e) => updateHistory(index, "employer", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`role-${index}`}>Job Role</Label>
                  <Input id={`role-${index}`} placeholder="Your job role" value={job.role} onChange={(e) => updateHistory(index, "role", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`duration-${index}`}>Duration</Label>
                  <Input
                    id={`duration-${index}`}
                    placeholder="e.g., 2 years"
                    value={job.duration}
                    onChange={(e) => updateHistory(index, "duration", e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <Button className="w-full" onClick={submit} disabled={busy}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Register as Worker
        </Button>
        <div className="text-center text-sm">
          Already registered?{" "}
          <Link href="/login?type=worker" className="underline underline-offset-4 hover:text-primary">
            Login here
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}

function EmployerForm() {
  const router = useRouter()
  const [form, setForm] = useState({
    companyName: "",
    contactPerson: "",
    aadhaarGst: "",
    email: "",
    phone: "",
    industry: "",
    location: "",
    address: "",
  })
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }))

  const submit = async () => {
    setError(null)
    if (!token) return setError("Verify your GSTIN / Aadhaar number first.")
    if (!form.companyName.trim() || !form.contactPerson.trim()) return setError("Enter the company name and contact person.")
    if (!isValidPhone(form.phone)) return setError("Enter a valid 10-digit mobile number.")
    setBusy(true)
    try {
      await api("/api/auth/register", {
        body: { role: "employer", identifier: form.aadhaarGst, verificationToken: token, ...form },
      })
      router.replace("/employer/dashboard")
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Employer Registration</CardTitle>
        <CardDescription>Enter your company details to register as an employer</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="company-name">Company Name</Label>
            <Input id="company-name" value={form.companyName} onChange={(e) => set({ companyName: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-person">Contact Person Name</Label>
            <Input id="contact-person" value={form.contactPerson} onChange={(e) => set({ contactPerson: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">Contact Email</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="employer-phone">Contact Phone</Label>
            <Input id="employer-phone" placeholder="10-digit mobile number" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
          </div>
        </div>
        <IdentityVerification
          role="employer"
          identifier={form.aadhaarGst}
          setIdentifier={(aadhaarGst) => set({ aadhaarGst })}
          phone={form.phone}
          token={token}
          onVerified={setToken}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="industry">Industry</Label>
            <Input id="industry" placeholder="e.g. Construction" value={form.industry} onChange={(e) => set({ industry: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emp-location">City / District</Label>
            <Input id="emp-location" value={form.location} onChange={(e) => set({ location: e.target.value })} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="emp-address">Address</Label>
          <Textarea id="emp-address" value={form.address} onChange={(e) => set({ address: e.target.value })} />
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <Button className="w-full" onClick={submit} disabled={busy}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Register as Employer
        </Button>
        <div className="text-center text-sm">
          Already registered?{" "}
          <Link href="/login?type=employer" className="underline underline-offset-4 hover:text-primary">
            Login here
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}

function RegisterTabs() {
  const defaultType = useSearchParams().get("type") === "employer" ? "employer" : "worker"
  return (
    <Tabs defaultValue={defaultType} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="worker">Worker Registration</TabsTrigger>
        <TabsTrigger value="employer">Employer Registration</TabsTrigger>
      </TabsList>
      <TabsContent value="worker">
        <WorkerForm />
      </TabsContent>
      <TabsContent value="employer">
        <EmployerForm />
      </TabsContent>
    </Tabs>
  )
}

export default function RegisterPage() {
  return (
    <div className="container py-10">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" />
        Back to home
      </Link>
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 max-w-2xl">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Create an Account</h1>
          <p className="text-sm text-muted-foreground">Register to access the MigrantConnect platform</p>
        </div>
        <Suspense>
          <RegisterTabs />
        </Suspense>
      </div>
    </div>
  )
}
