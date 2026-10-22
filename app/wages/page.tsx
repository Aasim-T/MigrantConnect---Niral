"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, CheckCircle } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { api, fmtDate, inr, useApi } from "@/lib/api"

const ISSUE_TITLES: Record<string, string> = {
  delayed: "Delayed Payment",
  incorrect: "Incorrect Wage Amount",
  other: "Wage Issue",
}

export default function WagesPage() {
  const { data, loading, reload } = useApi<{ employments: any[]; records: any[]; disputes: any[] }>("/api/wages")
  const [currentJob, setCurrentJob] = useState<any>(null)
  const [issueType, setIssueType] = useState("delayed")
  const [details, setDetails] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<any>(null)

  const employments = data?.employments || []
  const records = data?.records || []
  const disputes = data?.disputes || []
  const currentJobs = employments.filter((e) => e.status === "Active")
  const pastJobs = employments.filter((e) => e.status === "Ended")
  const paid = records.filter((r) => r.status === "Paid")
  const pending = records.filter((r) => r.status === "Pending")
  const year = new Date().getFullYear()
  const yearTotal = paid.filter((r) => new Date(r.paidAt).getFullYear() === year).reduce((s, r) => s + r.amount, 0)
  const nextDue = pending.map((r) => r.dueDate).sort()[0]
  const thisMonth = records
    .filter((r) => new Date(r.createdAt).getMonth() === new Date().getMonth() && new Date(r.createdAt).getFullYear() === year)
    .reduce((s, r) => s + r.amount, 0)

  const openReport = (job: any) => {
    setCurrentJob(job)
    setIssueType("delayed")
    setDetails("")
    setError(null)
    setCreated(null)
  }

  const submitReport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!details.trim()) return setError("Describe the issue so the employer can act on it.")
    setSubmitting(true)
    setError(null)
    // Link the dispute to the oldest unpaid entry for this job, if any
    const wage = pending.filter((r) => r.employmentId === currentJob.id).sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]
    try {
      const r = await api("/api/grievances", {
        body: {
          type: "Wage Dispute",
          title: ISSUE_TITLES[issueType],
          description: details,
          employerId: currentJob.employerId,
          jobTitle: currentJob.title,
          workPeriod: wage?.period,
          amountDue: wage?.amount,
          wageRecordId: wage?.id,
        },
      })
      setCreated(r.grievance)
      reload()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div>
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <h2 className="text-3xl font-bold tracking-tight">My Wages</h2>
        <p className="text-muted-foreground">Track your earnings and payment status</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recorded This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inr(thisMonth)}</div>
            <p className="text-xs text-muted-foreground">From {currentJobs.length} active job(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${pending.length ? "text-orange-600" : ""}`}>
              {inr(pending.reduce((s, r) => s + r.amount, 0))}
            </div>
            <p className="text-xs text-muted-foreground">{nextDue ? `Next due ${fmtDate(nextDue)}` : "Nothing pending"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Received ({year})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inr(yearTotal)}</div>
            <p className="text-xs text-muted-foreground">From {employments.length} job(s)</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="current" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="current">Current Jobs & Wages</TabsTrigger>
          <TabsTrigger value="history">Payment History</TabsTrigger>
          <TabsTrigger value="disputes">Disputes ({disputes.filter((d) => d.status !== "Resolved").length})</TabsTrigger>
          <TabsTrigger value="past">Past Jobs</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4">
          {loading && <p className="text-muted-foreground">Loading...</p>}
          {!loading && currentJobs.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No active jobs. When an employer selects you for a job, it appears here with your wages.
              </CardContent>
            </Card>
          )}
          {currentJobs.map((job) => (
            <Card key={job.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{job.title}</CardTitle>
                    <CardDescription>{job.employerName}</CardDescription>
                  </div>
                  <Badge variant={job.pendingAmount ? "secondary" : "default"}>{job.pendingAmount ? "Payment pending" : "Up to date"}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm font-medium">Location</div>
                    <div className="text-sm">{job.location}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Start Date</div>
                    <div className="text-sm">{fmtDate(job.startDate)}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Daily Wage</div>
                    <div className="text-sm">{inr(job.dailyWage)}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Days Recorded</div>
                    <div className="text-sm">{job.daysWorked} days</div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm font-medium">Total Earned</div>
                    <div className="text-lg font-bold">{inr(job.totalEarned)}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Paid</div>
                    <div className="text-lg">{inr(job.totalPaid)}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Pending</div>
                    <div className={`text-lg ${job.pendingAmount ? "text-orange-600 font-semibold" : ""}`}>{inr(job.pendingAmount)}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">{job.nextDue ? "Next Due" : "Last Paid"}</div>
                    <div className="text-sm">{fmtDate(job.nextDue || job.lastPaidAt)}</div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" onClick={() => openReport(job)}>
                  Report Issue
                </Button>
              </CardFooter>
            </Card>
          ))}
          {pending.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Unpaid Entries</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Due</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pending.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">
                          {r.jobTitle}
                          <div className="text-xs text-muted-foreground">{r.employerName}</div>
                        </TableCell>
                        <TableCell>{r.period}</TableCell>
                        <TableCell>{r.daysWorked}</TableCell>
                        <TableCell>{inr(r.amount)}</TableCell>
                        <TableCell className={new Date(r.dueDate) < new Date() ? "text-red-600 font-medium" : ""}>
                          {fmtDate(r.dueDate)}
                          {new Date(r.dueDate) < new Date() && " (overdue)"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>Record of all payments received</CardDescription>
            </CardHeader>
            <CardContent>
              {paid.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job Title</TableHead>
                      <TableHead>Employer</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment Date</TableHead>
                      <TableHead>Method</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paid.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.jobTitle}</TableCell>
                        <TableCell>{p.employerName}</TableCell>
                        <TableCell>{p.period}</TableCell>
                        <TableCell>{inr(p.amount)}</TableCell>
                        <TableCell>{fmtDate(p.paidAt)}</TableCell>
                        <TableCell>
                          {p.method}
                          {p.transactionId && <div className="text-xs text-muted-foreground">Ref {p.transactionId}</div>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="disputes" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Payment Disputes</CardTitle>
                <CardDescription>Track the status of your payment disputes</CardDescription>
              </div>
              <Link href="/grievances/create?type=Wage%20Dispute">
                <Button size="sm">Report New Issue</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {disputes.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Issue</TableHead>
                      <TableHead>Employer</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Filed</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {disputes.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">{d.title}</TableCell>
                        <TableCell>{d.employerName}</TableCell>
                        <TableCell>{d.workPeriod || "—"}</TableCell>
                        <TableCell>{d.amountDue ? inr(d.amountDue) : "—"}</TableCell>
                        <TableCell>
                          <Badge variant={d.status === "Resolved" ? "default" : "outline"}>{d.status}</Badge>
                        </TableCell>
                        <TableCell>{fmtDate(d.filedAt)}</TableCell>
                        <TableCell>
                          <Link href={`/grievances/${d.id}`}>
                            <Button variant="outline" size="sm" className="h-8">
                              View Details
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mb-2" />
                  <h3 className="text-lg font-medium">No Disputes</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md">
                    If you are having problems with your payments, report them from the job card or the grievance form.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="past" className="space-y-4">
          {pastJobs.length === 0 && <p className="text-muted-foreground">No past jobs yet.</p>}
          {pastJobs.map((job) => (
            <Card key={job.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{job.title}</CardTitle>
                    <CardDescription>{job.employerName}</CardDescription>
                  </div>
                  <Badge variant={job.pendingAmount ? "secondary" : "default"}>{job.pendingAmount ? "Payment pending" : "Fully paid"}</Badge>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm font-medium">Location</div>
                  <div className="text-sm">{job.location}</div>
                </div>
                <div>
                  <div className="text-sm font-medium">Period</div>
                  <div className="text-sm">
                    {fmtDate(job.startDate)} - {fmtDate(job.endDate)}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium">Total Earned</div>
                  <div className="text-lg font-bold">{inr(job.totalEarned)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium">Pending</div>
                  <div className="text-sm">{inr(job.pendingAmount)}</div>
                </div>
              </CardContent>
              {job.pendingAmount > 0 && (
                <CardFooter>
                  <Button variant="outline" onClick={() => openReport(job)}>
                    Report Issue
                  </Button>
                </CardFooter>
              )}
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(currentJob)} onOpenChange={(open) => !open && setCurrentJob(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Report Wage Issue</DialogTitle>
            <DialogDescription>
              Report an issue with your wages for {currentJob?.title} at {currentJob?.employerName}. It is filed as a grievance the employer
              must respond to.
            </DialogDescription>
          </DialogHeader>

          {!created ? (
            <form onSubmit={submitReport}>
              <div className="grid gap-4 py-4">
                <div>
                  <Label className="mb-2 block">Issue Type</Label>
                  <RadioGroup value={issueType} onValueChange={setIssueType}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="delayed" id="delayed" />
                      <Label htmlFor="delayed">Delayed Payment</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="incorrect" id="incorrect" />
                      <Label htmlFor="incorrect">Incorrect Amount</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="other" id="other" />
                      <Label htmlFor="other">Other Issue</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div>
                  <Label htmlFor="details" className="mb-2 block">
                    Details
                  </Label>
                  <Textarea
                    id="details"
                    placeholder="What happened? Include dates and amounts if you can."
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
              </div>
              <DialogFooter>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit Report"}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold">Report Submitted</h3>
              <p className="text-muted-foreground">The employer has been notified and must respond.</p>
              <p className="text-sm">Reference: {created.id}</p>
              <div className="flex gap-2">
                <Link href={`/grievances/${created.id}`}>
                  <Button variant="outline">Track it</Button>
                </Link>
                <Button onClick={() => setCurrentJob(null)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
