"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, MapPin, Phone, Search, Briefcase } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { api, inr, timeAgo, useApi } from "@/lib/api"

const STATUSES = ["New", "Shortlisted", "Interviewed", "Selected", "Rejected"]
const variant = (s: string) => (s === "Selected" ? "default" : s === "Rejected" ? "destructive" : s === "New" ? "secondary" : "outline")

/** Applicant review for one job (jobId) or across all of the employer's jobs. */
export function ApplicantsView({ jobId }: { jobId?: string }) {
  const params = useSearchParams()
  const path = jobId ? `/api/jobs/${jobId}/applicants` : "/api/applications"
  const { data, loading, error, reload } = useApi<{ job?: any; applicants?: any[]; applications?: any[] }>(path)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [selected, setSelected] = useState<any>(null)
  const [hiring, setHiring] = useState(false)
  const [dailyWage, setDailyWage] = useState("")
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const list: any[] = data?.applicants || data?.applications || []
  const filtered = list.filter(
    (a) =>
      (status === "all" || a.status === status) &&
      `${a.worker?.name} ${a.job?.title} ${(a.worker?.skills || []).join(" ")}`.toLowerCase().includes(search.toLowerCase()),
  )

  // Deep link from notifications: ?applicant=APP-xxx opens that applicant
  useEffect(() => {
    const id = params.get("applicant")
    const a = id && list.find((x) => x.id === id)
    if (a && !selected) setSelected(a)
  }, [params, list.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const setStatusFor = async (next: string, extra: Record<string, unknown> = {}) => {
    setBusy(true)
    setActionError(null)
    try {
      const r = await api(`/api/applications/${selected.id}`, { method: "PATCH", body: { status: next, ...extra } })
      setSelected(r.application)
      setHiring(false)
      reload()
    } catch (e) {
      setActionError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const job = data?.job
  const w = selected?.worker
  const defaultWage = selected?.job ? Math.round(selected.job.salaryMin / 26) : 0

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div>
        <Link
          href={jobId ? "/employer/jobs" : "/employer/dashboard"}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {jobId ? "Back to jobs" : "Back to dashboard"}
        </Link>
        <h2 className="text-3xl font-bold tracking-tight">{job ? `Applicants: ${job.title}` : "All Applicants"}</h2>
        <p className="text-muted-foreground">
          {job
            ? `${job.location} · ${inr(job.salaryMin)} - ${inr(job.salaryMax)}/month · ${job.status}`
            : "Review applications across all your job postings"}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        {STATUSES.map((s) => (
          <Card key={s} className={`cursor-pointer ${status === s ? "border-primary" : ""}`} onClick={() => setStatus(status === s ? "all" : s)}>
            <CardHeader className="pb-1">
              <CardDescription>{s}</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{list.filter((a) => a.status === s).length}</CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-2 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search by name, job or skill..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading && <p className="text-muted-foreground">Loading applicants...</p>}
          {error && <p className="text-red-600">{error}</p>}
          {!loading && filtered.length === 0 && <p className="py-6 text-center text-muted-foreground">No applicants found.</p>}
          {filtered.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  {!jobId && <TableHead>Job</TableHead>}
                  <TableHead>Skills</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      {a.worker?.name}
                      <div className="text-xs text-muted-foreground">{a.worker?.age ? `${a.worker.age} yrs` : ""}</div>
                    </TableCell>
                    {!jobId && <TableCell>{a.job?.title}</TableCell>}
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(a.worker?.skills || []).slice(0, 3).map((s: string) => (
                          <Badge key={s} variant={a.job?.skills?.includes(s) ? "default" : "secondary"} className="text-xs">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{a.worker?.location}</TableCell>
                    <TableCell>{timeAgo(a.appliedAt)}</TableCell>
                    <TableCell>
                      <Badge variant={variant(a.status)}>{a.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => setSelected(a)}>
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null)
            setHiring(false)
            setActionError(null)
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>Applicant Details</DialogTitle>
                <DialogDescription>
                  {selected.id} · applied for {selected.job?.title} {timeAgo(selected.appliedAt)}
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  {w?.photo && <AvatarImage src={w.photo} alt={w.name} />}
                  <AvatarFallback>{(w?.name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-medium">{w?.name}</h3>
                    <Badge variant={variant(selected.status)}>{selected.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {w?.id} {w?.age ? `· ${w.age} years old` : ""}
                  </p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {w?.location || "—"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {w?.phone}
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 text-sm">
                <div>
                  <h4 className="font-medium">Skills</h4>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(w?.skills || []).map((s: string) => (
                      <Badge key={s} variant={selected.job?.skills?.includes(s) ? "default" : "secondary"}>
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium">Languages</h4>
                  <p className="mt-1">{(w?.languages || []).join(", ") || "—"}</p>
                </div>
                <div>
                  <h4 className="font-medium">Education</h4>
                  <p className="mt-1">{w?.education || "—"}</p>
                </div>
                <div>
                  <h4 className="font-medium">Work history</h4>
                  {(w?.employmentHistory || []).length === 0 && <p className="mt-1">—</p>}
                  {(w?.employmentHistory || []).map((h: any, i: number) => (
                    <p key={i} className="mt-1 flex items-center gap-1">
                      <Briefcase className="h-3 w-3" /> {h.role} at {h.employer} ({h.duration})
                    </p>
                  ))}
                </div>
              </div>
              <div className="text-sm">
                <h4 className="font-medium">Application note</h4>
                <p className="mt-1">{selected.note || "—"}</p>
              </div>

              {hiring ? (
                <div className="space-y-2 rounded-md border p-3">
                  <Label htmlFor="daily-wage">Daily wage (₹)</Label>
                  <Input
                    id="daily-wage"
                    inputMode="numeric"
                    placeholder={String(defaultWage)}
                    value={dailyWage}
                    onChange={(e) => setDailyWage(e.target.value.replace(/\D/g, ""))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Hiring creates an employment record. You then log days worked in Wage Management, and the worker sees every entry.
                  </p>
                </div>
              ) : null}
              {actionError && <p className="text-sm text-red-600">{actionError}</p>}

              <DialogFooter className="flex-wrap gap-2 sm:justify-between">
                {selected.status === "Selected" ? (
                  <Link href="/employer/wages">
                    <Button>Go to Wage Management</Button>
                  </Link>
                ) : hiring ? (
                  <>
                    <Button variant="outline" onClick={() => setHiring(false)}>
                      Back
                    </Button>
                    <Button disabled={busy} onClick={() => setStatusFor("Selected", { dailyWage: Number(dailyWage) || defaultWage })}>
                      Confirm hire at {inr(Number(dailyWage) || defaultWage)}/day
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex gap-2">
                      {selected.status !== "Shortlisted" && (
                        <Button variant="outline" disabled={busy} onClick={() => setStatusFor("Shortlisted")}>
                          Shortlist
                        </Button>
                      )}
                      {selected.status !== "Interviewed" && (
                        <Button variant="outline" disabled={busy} onClick={() => setStatusFor("Interviewed")}>
                          Mark interviewed
                        </Button>
                      )}
                      {selected.status !== "Rejected" && (
                        <Button variant="outline" className="text-red-600" disabled={busy} onClick={() => setStatusFor("Rejected")}>
                          Reject
                        </Button>
                      )}
                    </div>
                    <Button disabled={busy} onClick={() => setHiring(true)}>
                      Hire worker
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
