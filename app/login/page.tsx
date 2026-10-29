"use client"

import { Suspense, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Users, Building2, Loader2, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { api } from "@/lib/api"
import { RailField } from "@/components/rail-field"

type Role = "worker" | "employer"

function LoginForm({ role }: { role: Role }) {
  const router = useRouter()
  const next = useSearchParams().get("next")
  const [identifier, setIdentifier] = useState("")
  const [otp, setOtp] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const sendOtp = async () => {
    setBusy(true)
    setError(null)
    try {
      const r = await api<{ maskedPhone: string | null; demoOtp?: string; demoFixedOtp?: string }>("/api/auth/otp", {
        body: { role, identifier, purpose: "login" },
      })
      setOtpSent(true)
      setHint(
        [
          r.maskedPhone ? `OTP sent to ${r.maskedPhone}.` : "OTP generated.",
          r.demoOtp ? `Demo mode: your OTP is ${r.demoOtp}.` : "",
          r.demoFixedOtp ? `The demo account also accepts ${r.demoFixedOtp}.` : "",
        ]
          .filter(Boolean)
          .join(" "),
      )
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const login = async () => {
    setBusy(true)
    setError(null)
    try {
      await api("/api/auth/verify", { body: { role, identifier, otp, purpose: "login" } })
      const home = role === "worker" ? "/dashboard" : "/employer/dashboard"
      // Only follow ?next= to a page inside this role's own area
      const ownArea = (p: string) =>
        p.startsWith("/") && !p.startsWith("//") && p.startsWith("/employer") === (role === "employer") && p !== "/login"
      router.replace(next && ownArea(next) ? next : home)
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  const isWorker = role === "worker"
  return (
    <Card>
      <CardHeader>
        <CardTitle>{isWorker ? "Worker Login" : "Employer Login"}</CardTitle>
        <CardDescription>
          {isWorker ? "Enter your Aadhaar number to receive an OTP" : "Enter your GSTIN or contact Aadhaar number"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`id-${role}`}>{isWorker ? "Aadhaar Number" : "GSTIN / Aadhaar Number"}</Label>
          <div className="flex gap-2">
            <Input
              id={`id-${role}`}
              placeholder={isWorker ? "XXXX XXXX XXXX" : "33AABCA1234F1ZG"}
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value)
                setOtpSent(false)
                setOtp("")
              }}
              autoComplete="off"
            />
            <Button onClick={sendOtp} disabled={busy || identifier.replace(/\s/g, "").length < 12} variant={otpSent ? "outline" : "default"}>
              {otpSent ? "Resend" : "Send OTP"}
            </Button>
          </div>
        </div>
        {otpSent && (
          <div className="space-y-2">
            <Label htmlFor={`otp-${role}`}>OTP</Label>
            <Input
              id={`otp-${role}`}
              placeholder="Enter OTP"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && otp.length >= 4 && login()}
            />
          </div>
        )}
        {hint && (
          <Alert>
            <ShieldCheck className="h-4 w-4" />
            <AlertDescription>{hint}</AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <Button className="w-full" onClick={login} disabled={busy || !otpSent || otp.length < 4}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Login
        </Button>
        <div className="text-center text-sm">
          {isWorker ? "New user?" : "New employer?"}{" "}
          <Link href={`/register?type=${role}`} className="underline underline-offset-4 hover:text-primary">
            Register here
          </Link>
        </div>
        <div className="text-center text-xs text-muted-foreground">
          Demo: {isWorker ? "Aadhaar 1234 1234 1234" : "GSTIN 33AABCA1234F1ZG or Aadhaar 1234 1234 1234"}, OTP shown on screen
        </div>
      </CardFooter>
    </Card>
  )
}

function LoginTabs() {
  const defaultType = useSearchParams().get("type") === "employer" ? "employer" : "worker"
  return (
    <Tabs defaultValue={defaultType} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="worker" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Worker
        </TabsTrigger>
        <TabsTrigger value="employer" className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Employer
        </TabsTrigger>
      </TabsList>
      <TabsContent value="worker">
        <LoginForm role="worker" />
      </TabsContent>
      <TabsContent value="employer">
        <LoginForm role="employer" />
      </TabsContent>
    </Tabs>
  )
}

export default function LoginPage() {
  return (
    <div className="mc-landing grid min-h-screen bg-white text-ink lg:grid-cols-2">
      <aside className="relative isolate flex min-h-[220px] flex-col justify-between overflow-hidden bg-signal p-4 md:p-8 lg:min-h-screen">
        <RailField className="absolute inset-x-0 bottom-0 -z-10 h-[55%]" convergeX={2} tracks={7} />
        <Link href="/" className="inline-flex w-fit items-center gap-2 text-lg font-extrabold tracking-tight" style={{ fontStretch: "88%" }}>
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          MigrantConnect
        </Link>
        <p
          className="mt-10 hidden max-w-[12ch] text-4xl font-extrabold lg:block leading-[0.95] tracking-[-0.03em] md:text-6xl lg:mb-[58vh]"
          style={{ fontStretch: "82%" }}
        >
          Your work, on record.
        </p>
      </aside>

      <main className="flex items-center justify-center px-4 py-12 md:px-8">
        <div className="flex w-full max-w-[420px] flex-col space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-[-0.02em] md:text-4xl">Log in</h1>
            <p className="text-base text-muted-foreground">We send a one-time password to the phone linked to your Aadhaar.</p>
          </div>
          <Suspense>
            <LoginTabs />
          </Suspense>
        </div>
      </main>
    </div>
  )
}
