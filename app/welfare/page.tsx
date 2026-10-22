"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, CheckCircle, FileText, Upload, X, XCircle, AlertTriangle } from "lucide-react"
import { useSession } from "@/components/session-provider"
import { api, fileToDataUrl, fmtDate, useApi } from "@/lib/api"

type Doc = { name: string; fileName: string; size: number; type: string; dataUrl: string }

function SchemeCard({ scheme, onApply }: { scheme: any; onApply: (s: any) => void }) {
  const check = scheme.eligibility_check
  const app = scheme.application
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex justify-between gap-2">
          <CardTitle className="text-lg">{scheme.name}</CardTitle>
          {app ? (
            <Badge>{app.status}</Badge>
          ) : check?.eligible ? (
            <Badge className="bg-green-600">Eligible</Badge>
          ) : check?.missing.length ? (
            <Badge variant="outline">Check profile</Badge>
          ) : (
            <Badge variant="secondary">Not eligible</Badge>
          )}
        </div>
        <CardDescription>{scheme.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-2 text-sm">
        <div>
          <span className="font-medium">Eligibility:</span> {scheme.eligibility}
        </div>
        <div>
          <span className="font-medium">Benefits:</span> {scheme.benefits}
        </div>
        <div>
          <span className="font-medium">Documents:</span> {scheme.documents.join(", ")}
        </div>
        <div>
          <span className="font-medium">How to apply:</span> {scheme.applicationProcess}
        </div>
        {check && !app && (
          <div
            className={`flex gap-2 rounded-md p-2 ${
              check.eligible ? "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200" : "bg-muted"
            }`}
          >
            {check.eligible ? <CheckCircle className="h-4 w-4 shrink-0" /> : check.missing.length ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
            <span>{check.message}</span>
          </div>
        )}
        {app && (
          <div className="rounded-md bg-muted p-2">
            Applied {fmtDate(app.submittedAt)} · Reference <span className="font-mono">{app.reference}</span>
          </div>
        )}
      </CardContent>
      <CardFooter>
        {app ? (
          <Button variant="outline" className="w-full" disabled>
            Application {app.status.toLowerCase()}
          </Button>
        ) : check?.missing.length ? (
          <Link href="/profile" className="w-full">
            <Button variant="outline" className="w-full">
              Complete profile
            </Button>
          </Link>
        ) : (
          <Button className="w-full" variant={check?.eligible ? "default" : "outline"} onClick={() => onApply(scheme)}>
            {check?.eligible ? "Apply Now" : "Apply anyway (for review)"}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

function WelfareContent() {
  const { user } = useSession()
  const params = useSearchParams()
  const { data, loading, reload } = useApi<{ schemes: any[] }>("/api/welfare")
  const [current, setCurrent] = useState<any>(null)
  const [form, setForm] = useState({
    fullName: user.name,
    aadhaarNumber: "",
    address: user.address || "",
    phoneNumber: user.phone || "",
    bankAccount: "",
    ifscCode: "",
    annualIncome: user.annualIncome ? String(user.annualIncome) : "",
    note: "",
  })
  const [docs, setDocs] = useState<Doc[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState<any>(null)
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }))

  const schemes = data?.schemes || []
  const eligible = schemes.filter((s) => s.eligibility_check?.eligible || s.application)
  const other = schemes.filter((s) => !(s.eligibility_check?.eligible || s.application))
  const applications = schemes.filter((s) => s.application)

  const openApply = (scheme: any) => {
    setCurrent(scheme)
    setDocs([])
    setError(null)
    setSubmitted(null)
  }

  // Deep link from the dashboard: /welfare?scheme=SCH-...
  useEffect(() => {
    const id = params.get("scheme")
    const s = id && schemes.find((x) => x.id === id && !x.application)
    if (s) openApply(s)
  }, [params, schemes.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const upload = async (name: string, file: File | undefined) => {
    if (!file) return
    if (file.size > 2 * 1024 * 1024) return setError(`${file.name} is larger than 2 MB`)
    const dataUrl = await fileToDataUrl(file)
    setDocs((d) => [...d.filter((x) => x.name !== name), { name, fileName: file.name, size: file.size, type: file.type, dataUrl }])
    setError(null)
  }

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      const r = await api("/api/welfare/applications", { body: { schemeId: current.id, ...form, documents: docs } })
      setSubmitted(r.application)
      reload()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div>
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <h2 className="text-3xl font-bold tracking-tight">Welfare Schemes</h2>
        <p className="text-muted-foreground">Government schemes checked against your profile (age, income, bank account, occupation)</p>
      </div>

      <Tabs defaultValue="eligible" className="space-y-4">
        <TabsList>
          <TabsTrigger value="eligible">For You ({eligible.length})</TabsTrigger>
          <TabsTrigger value="other">Other Schemes ({other.length})</TabsTrigger>
          <TabsTrigger value="applications">My Applications ({applications.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="eligible">
          {loading && <p className="text-muted-foreground">Checking eligibility...</p>}
          {!loading && eligible.length === 0 && (
            <p className="text-muted-foreground">No schemes match your profile yet. Add your income and bank details in My Profile.</p>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {eligible.map((s) => (
              <SchemeCard key={s.id} scheme={s} onApply={openApply} />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="other">
          <div className="grid gap-4 md:grid-cols-2">
            {other.map((s) => (
              <SchemeCard key={s.id} scheme={s} onApply={openApply} />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="applications" className="space-y-3">
          {applications.length === 0 && <p className="text-muted-foreground">You have not applied for any scheme yet.</p>}
          {applications.map((s) => (
            <Card key={s.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-2 py-4">
                <div>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Ref {s.application.reference} · submitted {fmtDate(s.application.submittedAt)} · {s.application.documentCount} document(s)
                  </div>
                </div>
                <Badge>{s.application.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(current)} onOpenChange={(open) => !open && setCurrent(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {submitted ? (
            <div className="flex flex-col items-center py-6 text-center space-y-3">
              <CheckCircle className="h-16 w-16 text-green-500" />
              <h3 className="text-xl font-semibold">Application Submitted</h3>
              <p className="text-muted-foreground">
                Your application for {current?.name} has been recorded. Keep this reference number:
              </p>
              <p className="font-mono text-lg">{submitted.reference}</p>
              <Button onClick={() => setCurrent(null)}>Close</Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Apply for {current?.name}</DialogTitle>
                <DialogDescription>Worker ID {user.id}. Details are pre-filled from your profile.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" value={form.fullName} onChange={(e) => set({ fullName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="aadhaarNumber">Aadhaar Number</Label>
                  <Input
                    id="aadhaarNumber"
                    placeholder={user.aadhaarMasked}
                    value={form.aadhaarNumber}
                    onChange={(e) => set({ aadhaarNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea id="address" value={form.address} onChange={(e) => set({ address: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input id="phoneNumber" value={form.phoneNumber} onChange={(e) => set({ phoneNumber: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="annualIncome">Annual Income (₹)</Label>
                  <Input id="annualIncome" inputMode="numeric" value={form.annualIncome} onChange={(e) => set({ annualIncome: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankAccount">Bank Account Number</Label>
                  <Input id="bankAccount" inputMode="numeric" value={form.bankAccount} onChange={(e) => set({ bankAccount: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ifscCode">IFSC Code</Label>
                  <Input id="ifscCode" placeholder="SBIN0001234" value={form.ifscCode} onChange={(e) => set({ ifscCode: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Required Documents (PDF or image, max 2 MB)</Label>
                {current?.documents.map((name: string) => {
                  const doc = docs.find((d) => d.name === name)
                  return (
                    <div key={name} className="flex items-center justify-between gap-2 rounded-md border p-2">
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4" />
                        <span className="font-medium">{name}</span>
                        {doc && <span className="text-muted-foreground">({doc.fileName})</span>}
                      </div>
                      {doc ? (
                        <Button variant="ghost" size="sm" onClick={() => setDocs((d) => d.filter((x) => x.name !== name))}>
                          <X className="h-4 w-4" />
                        </Button>
                      ) : (
                        <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border px-3 py-1 text-sm hover:bg-muted">
                          <Upload className="h-4 w-4" /> Upload
                          <input
                            type="file"
                            accept="application/pdf,image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={(e) => upload(name, e.target.files?.[0])}
                          />
                        </label>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="space-y-2">
                <Label htmlFor="note">Note (optional)</Label>
                <Textarea id="note" value={form.note} onChange={(e) => set({ note: e.target.value })} />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <DialogFooter>
                <Button variant="outline" onClick={() => setCurrent(null)}>
                  Cancel
                </Button>
                <Button onClick={submit} disabled={busy}>
                  {busy ? "Submitting..." : "Submit Application"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function WelfarePage() {
  return (
    <Suspense>
      <WelfareContent />
    </Suspense>
  )
}
