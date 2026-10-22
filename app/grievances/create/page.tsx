"use client"

import type React from "react"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, CheckCircle } from "lucide-react"
import { motion } from "framer-motion"
import { api, fmtDate, inr, useApi } from "@/lib/api"
import { GRIEVANCE_TYPES } from "@/lib/validation"

const OTHER = "__other"

function CreateGrievanceForm() {
  const router = useRouter()
  const params = useSearchParams()
  const { data } = useApi<{ employers: any[]; pendingWages: any[] }>("/api/employers")
  const [form, setForm] = useState({
    title: "",
    type: params.get("type") || "",
    employerId: "",
    employerName: "",
    jobTitle: "",
    wageRecordId: "",
    description: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [created, setCreated] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }))

  const employers = data?.employers || []
  const employer = employers.find((e) => e.id === form.employerId)
  const wagesForEmployer = (data?.pendingWages || []).filter((w) => w.employerId === form.employerId)
  const wage = wagesForEmployer.find((w) => w.id === form.wageRecordId)

  useEffect(() => {
    if (!form.employerId && employers.length === 1) set({ employerId: employers[0].id })
  }, [employers, form.employerId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!form.type) return setError("Select the grievance type.")
    if (!form.employerId) return setError("Select the employer.")
    if (form.employerId === OTHER && !form.employerName.trim()) return setError("Enter the employer's name.")
    setIsSubmitting(true)
    try {
      const r = await api("/api/grievances", {
        body: {
          title: form.title,
          type: form.type,
          description: form.description,
          employerId: form.employerId === OTHER ? undefined : form.employerId,
          employerName: form.employerId === OTHER ? form.employerName : undefined,
          jobTitle: form.jobTitle || employer?.jobs?.[0],
          wageRecordId: wage?.id,
          workPeriod: wage?.period,
          amountDue: wage?.amount,
        },
      })
      setCreated(r.grievance)
      setTimeout(() => router.push(`/grievances/${r.grievance.id}`), 1500)
    } catch (err) {
      setError((err as Error).message)
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Grievance Details</CardTitle>
        <CardDescription>The employer is notified immediately and can reply in the grievance thread.</CardDescription>
      </CardHeader>
      {created ? (
        <CardContent className="flex flex-col items-center justify-center py-10 space-y-3 text-center">
          <CheckCircle className="h-16 w-16 text-green-500" />
          <h3 className="text-xl font-medium">Grievance Submitted</h3>
          <p className="text-muted-foreground">Reference {created.id}. Opening the grievance...</p>
        </CardContent>
      ) : (
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="type">Grievance Type</Label>
              <Select value={form.type} onValueChange={(type) => set({ type })}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {GRIEVANCE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Short summary, e.g. Wages for May not paid"
                value={form.title}
                onChange={(e) => set({ title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employer">Employer</Label>
              <Select value={form.employerId} onValueChange={(employerId) => set({ employerId, wageRecordId: "" })}>
                <SelectTrigger id="employer">
                  <SelectValue placeholder="Select employer" />
                </SelectTrigger>
                <SelectContent>
                  {employers.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.companyName}
                    </SelectItem>
                  ))}
                  <SelectItem value={OTHER}>Another employer (not on MigrantConnect)</SelectItem>
                </SelectContent>
              </Select>
              {form.employerId === OTHER && (
                <Input placeholder="Employer / contractor name" value={form.employerName} onChange={(e) => set({ employerName: e.target.value })} />
              )}
            </div>
            {form.type === "Wage Dispute" && wagesForEmployer.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="wage">Unpaid wage entry (optional)</Label>
                <Select value={form.wageRecordId} onValueChange={(wageRecordId) => set({ wageRecordId })}>
                  <SelectTrigger id="wage">
                    <SelectValue placeholder="Link an unpaid entry" />
                  </SelectTrigger>
                  <SelectContent>
                    {wagesForEmployer.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.period} · {inr(w.amount)} · due {fmtDate(w.dueDate)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">When the employer pays this entry, the grievance is resolved automatically.</p>
              </div>
            )}
            {employer?.jobs?.length > 1 && (
              <div className="space-y-2">
                <Label htmlFor="job">Job</Label>
                <Select value={form.jobTitle} onValueChange={(jobTitle) => set({ jobTitle })}>
                  <SelectTrigger id="job">
                    <SelectValue placeholder="Select job" />
                  </SelectTrigger>
                  <SelectContent>
                    {employer.jobs.map((j: string) => (
                      <SelectItem key={j} value={j}>
                        {j}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                className="min-h-[140px]"
                placeholder="Describe what happened, when, and who was involved."
                value={form.description}
                onChange={(e) => set({ description: e.target.value })}
                required
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Link href="/grievances">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Grievance"}
            </Button>
          </CardFooter>
        </form>
      )}
    </Card>
  )
}

export default function CreateGrievancePage() {
  return (
    <motion.div
      className="flex-1 space-y-4 p-8 pt-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.4 } }}
    >
      <div>
        <Link href="/grievances" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
          <ArrowLeft className="h-4 w-4" />
          Back to grievances
        </Link>
        <h2 className="text-3xl font-bold tracking-tight">File a Grievance</h2>
        <p className="text-muted-foreground">Report an issue with your employer or working conditions</p>
      </div>
      <Suspense>
        <CreateGrievanceForm />
      </Suspense>
    </motion.div>
  )
}
