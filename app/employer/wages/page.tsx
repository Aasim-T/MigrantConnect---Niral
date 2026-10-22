"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, CheckCircle, Plus } from "lucide-react"
import { api, fmtDate, inr, useApi } from "@/lib/api"

const METHODS = ["Bank Transfer", "UPI", "Cash", "Cheque"]

const monthLabel = () => new Date().toLocaleString("en-IN", { month: "long", year: "numeric" })
const inDays = (d: number) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10)

export default function EmployerWagesPage() {
  const { data, loading, reload } = useApi<{ employments: any[]; records: any[] }>("/api/wages")
  const [entryFor, setEntryFor] = useState<any>(null)
  const [entry, setEntry] = useState({ period: monthLabel(), daysWorked: "", dailyWage: "", dueDate: inDays(7) })
  const [payFor, setPayFor] = useState<any>(null)
  const [pay, setPay] = useState({ method: "Bank Transfer", transactionId: "" })
  const [paid, setPaid] = useState<any>(null)
  const [endFor, setEndFor] = useState<any>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const employments = data?.employments || []
  const records = data?.records || []
  const active = employments.filter((e) => e.status === "Active")
  const pending = records.filter((r) => r.status === "Pending").sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const history = records.filter((r) => r.status === "Paid")
  const overdue = pending.filter((r) => new Date(r.dueDate) < new Date())

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
      reload()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const openEntry = (e: any) => {
    setEntryFor(e)
    setEntry({ period: monthLabel(), daysWorked: "", dailyWage: String(e.dailyWage), dueDate: inDays(7) })
    setError(null)
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div>
        <Link href="/employer/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <h2 className="text-3xl font-bold tracking-tight">Wage Management</h2>
        <p className="text-muted-foreground">Record days worked and pay your workers. Every entry is visible to the worker.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Workers employed</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{active.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{inr(pending.reduce((s, r) => s + r.amount, 0))}</CardContent>
        </Card>
        <Card className={overdue.length ? "border-red-400" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className={`text-sm font-medium ${overdue.length ? "text-red-600" : ""}`}>Overdue</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{overdue.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Paid (all time)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{inr(history.reduce((s, r) => s + r.amount, 0))}</CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pending Payments ({pending.length})</TabsTrigger>
          <TabsTrigger value="workers">Workforce ({active.length})</TabsTrigger>
          <TabsTrigger value="history">Payment History</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Payments</CardTitle>
              <CardDescription>Paying an entry also resolves any wage dispute linked to it</CardDescription>
            </CardHeader>
            <CardContent>
              {loading && <p className="text-muted-foreground">Loading...</p>}
              {!loading && pending.length === 0 && (
                <div className="flex flex-col items-center py-8 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mb-2" />
                  <p className="font-medium">All wages are paid</p>
                </div>
              )}
              {pending.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Worker</TableHead>
                      <TableHead>Job</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Days × Rate</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pending.map((r) => {
                      const late = new Date(r.dueDate) < new Date()
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.workerName}</TableCell>
                          <TableCell>{r.jobTitle}</TableCell>
                          <TableCell>{r.period}</TableCell>
                          <TableCell>
                            {r.daysWorked} × {inr(r.dailyWage)}
                          </TableCell>
                          <TableCell className="font-semibold">{inr(r.amount)}</TableCell>
                          <TableCell className={late ? "text-red-600 font-medium" : ""}>
                            {fmtDate(r.dueDate)}
                            {late && <Badge variant="destructive" className="ml-2">Overdue</Badge>}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => {
                                setPayFor(r)
                                setPaid(null)
                                setPay({ method: "Bank Transfer", transactionId: "" })
                                setError(null)
                              }}
                            >
                              Pay
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workers">
          <Card>
            <CardHeader>
              <CardTitle>Current Workforce</CardTitle>
              <CardDescription>Workers you hired through MigrantConnect</CardDescription>
            </CardHeader>
            <CardContent>
              {active.length === 0 ? (
                <p className="text-muted-foreground">
                  No workers yet. Hire applicants from <Link className="underline" href="/employer/applicants">Applicants</Link>.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Worker</TableHead>
                      <TableHead>Job</TableHead>
                      <TableHead>Since</TableHead>
                      <TableHead>Daily wage</TableHead>
                      <TableHead>Days logged</TableHead>
                      <TableHead>Paid / Pending</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {active.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">
                          {e.workerName}
                          <div className="text-xs text-muted-foreground">{e.workerId}</div>
                        </TableCell>
                        <TableCell>{e.title}</TableCell>
                        <TableCell>{fmtDate(e.startDate)}</TableCell>
                        <TableCell>{inr(e.dailyWage)}</TableCell>
                        <TableCell>{e.daysWorked}</TableCell>
                        <TableCell>
                          {inr(e.totalPaid)} / <span className={e.pendingAmount ? "text-orange-600" : ""}>{inr(e.pendingAmount)}</span>
                        </TableCell>
                        <TableCell className="space-x-2 whitespace-nowrap">
                          <Button size="sm" onClick={() => openEntry(e)}>
                            <Plus className="mr-1 h-3 w-3" /> Log days
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEndFor(e)}>
                            End
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-muted-foreground">No payments yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Worker</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Paid on</TableHead>
                      <TableHead>Method</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">
                          {r.workerName}
                          <div className="text-xs text-muted-foreground">{r.jobTitle}</div>
                        </TableCell>
                        <TableCell>{r.period}</TableCell>
                        <TableCell>{inr(r.amount)}</TableCell>
                        <TableCell>{fmtDate(r.paidAt)}</TableCell>
                        <TableCell>
                          {r.method}
                          {r.transactionId && <div className="text-xs text-muted-foreground">Ref {r.transactionId}</div>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Log days worked */}
      <Dialog open={Boolean(entryFor)} onOpenChange={(open) => !open && setEntryFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log days worked</DialogTitle>
            <DialogDescription>
              {entryFor?.workerName} · {entryFor?.title}. The worker is notified of the amount and due date.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="period">Period</Label>
              <Input id="period" value={entry.period} onChange={(e) => setEntry({ ...entry, period: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="days">Days worked</Label>
              <Input
                id="days"
                inputMode="numeric"
                value={entry.daysWorked}
                onChange={(e) => setEntry({ ...entry, daysWorked: e.target.value.replace(/\D/g, "") })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate">Daily wage (₹)</Label>
              <Input
                id="rate"
                inputMode="numeric"
                value={entry.dailyWage}
                onChange={(e) => setEntry({ ...entry, dailyWage: e.target.value.replace(/\D/g, "") })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due">Payment due</Label>
              <Input id="due" type="date" value={entry.dueDate} onChange={(e) => setEntry({ ...entry, dueDate: e.target.value })} />
            </div>
          </div>
          <p className="text-sm">
            Amount: <span className="font-semibold">{inr(Number(entry.daysWorked || 0) * Number(entry.dailyWage || 0))}</span>
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEntryFor(null)}>
              Cancel
            </Button>
            <Button
              disabled={busy || !entry.daysWorked}
              onClick={() =>
                run(async () => {
                  await api("/api/wages", {
                    body: { employmentId: entryFor.id, ...entry, daysWorked: Number(entry.daysWorked), dailyWage: Number(entry.dailyWage) },
                  })
                  setEntryFor(null)
                })
              }
            >
              Save entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay */}
      <Dialog open={Boolean(payFor)} onOpenChange={(open) => !open && setPayFor(null)}>
        <DialogContent>
          {paid ? (
            <div className="flex flex-col items-center py-6 space-y-3 text-center">
              <CheckCircle className="h-16 w-16 text-green-500" />
              <h3 className="text-xl font-semibold">Payment recorded</h3>
              <p className="text-muted-foreground">
                {inr(paid.amount)} to {payFor?.workerName} by {paid.method}. The worker has been notified.
              </p>
              <Button onClick={() => setPayFor(null)}>Close</Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Confirm Payment</DialogTitle>
                <DialogDescription>
                  {payFor?.workerName} · {payFor?.period} · {inr(payFor?.amount)}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Payment method</Label>
                  <Select value={pay.method} onValueChange={(method) => setPay({ ...pay, method })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {METHODS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {pay.method !== "Cash" && (
                  <div className="space-y-2">
                    <Label htmlFor="txn">Transaction / UTR reference</Label>
                    <Input id="txn" value={pay.transactionId} onChange={(e) => setPay({ ...pay, transactionId: e.target.value })} />
                  </div>
                )}
                {error && <p className="text-sm text-red-600">{error}</p>}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPayFor(null)} disabled={busy}>
                  Cancel
                </Button>
                <Button
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      const r = await api(`/api/wages/${payFor.id}`, { method: "PATCH", body: { status: "Paid", ...pay } })
                      setPaid(r.record)
                    })
                  }
                >
                  {busy ? "Processing..." : `Mark ${inr(payFor?.amount)} paid`}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* End employment */}
      <Dialog open={Boolean(endFor)} onOpenChange={(open) => !open && setEndFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End employment</DialogTitle>
            <DialogDescription>
              {endFor?.workerName} will be moved to past jobs. {endFor?.pendingAmount ? `${inr(endFor.pendingAmount)} is still unpaid.` : ""}
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEndFor(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await api(`/api/employments/${endFor.id}`, { method: "PATCH", body: { end: true } })
                  setEndFor(null)
                })
              }
            >
              End employment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
