"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle, IndianRupee, Loader2, RotateCcw, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useSession } from "@/components/session-provider"
import { api, fmtDate, inr, useApi } from "@/lib/api"

/** Grievance thread + actions. Workers reply, accept or reopen; employers reply, take up and resolve. */
export function GrievanceDetail({ id }: { id: string }) {
  const { user, refresh } = useSession()
  const isEmployer = user.role === "employer"
  const back = isEmployer ? "/employer/grievances" : "/grievances"
  const { data, error, loading, setData } = useApi<{ grievance: any; wage: any }>(`/api/grievances/${id}`)
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<null | "resolve" | "accept" | "reopen">(null)
  const [dialogText, setDialogText] = useState("")

  const patch = async (body: Record<string, unknown>) => {
    setBusy(true)
    setActionError(null)
    try {
      const r = await api(`/api/grievances/${id}`, { method: "PATCH", body })
      setData((d) => (d ? { ...d, grievance: r.grievance } : d))
      setDialog(null)
      setDialogText("")
      refresh()
      return true
    } catch (e) {
      setActionError((e as Error).message)
      return false
    } finally {
      setBusy(false)
    }
  }

  if (loading && !data) return <div className="p-8 text-muted-foreground">Loading grievance...</div>
  if (error || !data) {
    return (
      <div className="p-8 space-y-4">
        <p className="text-red-600">{error || "Grievance not found"}</p>
        <Link href={back}>
          <Button variant="outline">Back</Button>
        </Link>
      </div>
    )
  }

  const g = data.grievance
  const resolved = g.status === "Resolved"

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div>
        <Link href={back} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
          <ArrowLeft className="h-4 w-4" />
          Back to grievances
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-3xl font-bold tracking-tight">{g.title}</h2>
          <Badge variant={resolved ? "default" : g.status === "New" ? "secondary" : "outline"}>{g.status}</Badge>
          {resolved && g.acknowledged && <Badge variant="outline">Accepted by worker</Badge>}
        </div>
        <p className="text-muted-foreground">
          {g.id} · {g.type} · filed {fmtDate(g.filedAt)}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Conversation</CardTitle>
            <CardDescription>All messages are recorded for the labour department if the case escalates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {g.messages.map((m: any, i: number) => {
              const mine = (m.from === "Employer") === isEmployer
              return (
                <div key={i} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-lg p-3 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    <div className="mb-1 text-xs opacity-80">
                      {m.from === "Worker" ? g.workerName : m.from === "Employer" ? g.employerName : "Admin"} · {fmtDate(m.at)}
                    </div>
                    <div className="whitespace-pre-wrap">{m.message}</div>
                  </div>
                </div>
              )
            })}
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-2">
            {!resolved && (
              <>
                <Textarea placeholder="Write a reply..." value={message} onChange={(e) => setMessage(e.target.value)} />
                <div className="flex justify-end gap-2">
                  {isEmployer && g.status === "New" && (
                    <Button variant="outline" disabled={busy} onClick={() => patch({ status: "In Progress" })}>
                      Mark In Progress
                    </Button>
                  )}
                  <Button
                    disabled={busy || !message.trim()}
                    onClick={async () => (await patch({ message })) && setMessage("")}
                  >
                    {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Send
                  </Button>
                </div>
              </>
            )}
            {actionError && !dialog && <p className="text-sm text-red-600">{actionError}</p>}
          </CardFooter>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="font-medium">{isEmployer ? "Worker" : "Employer"}:</span>{" "}
                {isEmployer ? `${g.workerName} (${g.workerId})` : g.employerName}
              </div>
              {isEmployer && g.workerLocation && (
                <div>
                  <span className="font-medium">Location:</span> {g.workerLocation}
                </div>
              )}
              {g.jobTitle && (
                <div>
                  <span className="font-medium">Job:</span> {g.jobTitle}
                </div>
              )}
              {g.workPeriod && (
                <div>
                  <span className="font-medium">Period:</span> {g.workPeriod}
                </div>
              )}
              {g.amountDue != null && (
                <div>
                  <span className="font-medium">Amount in dispute:</span> {inr(g.amountDue)}
                </div>
              )}
              {data.wage && (
                <div className="rounded-md border p-2">
                  <div className="flex items-center gap-1 font-medium">
                    <IndianRupee className="h-3 w-3" /> Linked wage entry
                  </div>
                  <div>
                    {data.wage.period}: {inr(data.wage.amount)} · {data.wage.status}
                    {data.wage.status === "Paid" ? ` on ${fmtDate(data.wage.paidAt)}` : `, due ${fmtDate(data.wage.dueDate)}`}
                  </div>
                  {isEmployer && data.wage.status === "Pending" && (
                    <Link href="/employer/wages" className="text-primary underline">
                      Pay it in Wage Management
                    </Link>
                  )}
                </div>
              )}
              <div>
                <span className="font-medium">Last updated:</span> {fmtDate(g.updatedAt)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{resolved ? "Resolution" : "Actions"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {resolved && (
                <div className="rounded-md bg-green-50 p-3 text-green-800 dark:bg-green-950 dark:text-green-200">
                  <div className="flex items-center gap-1 font-medium">
                    <CheckCircle className="h-4 w-4" /> Resolved {fmtDate(g.resolvedAt)}
                  </div>
                  <p className="mt-1">{g.resolution}</p>
                  {g.feedback && <p className="mt-2 italic">Worker feedback: "{g.feedback}"</p>}
                </div>
              )}
              {isEmployer && !resolved && (
                <Button className="w-full" onClick={() => setDialog("resolve")}>
                  Resolve grievance
                </Button>
              )}
              {!isEmployer && resolved && !g.acknowledged && (
                <>
                  <p>Is the problem fixed?</p>
                  <Button className="w-full" onClick={() => setDialog("accept")}>
                    Accept resolution
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => setDialog("reopen")}>
                    <RotateCcw className="mr-2 h-4 w-4" /> Not fixed, reopen
                  </Button>
                </>
              )}
              {!isEmployer && !resolved && <p className="text-muted-foreground">Waiting for the employer to resolve this grievance.</p>}
              {isEmployer && resolved && !g.acknowledged && (
                <p className="text-muted-foreground">Waiting for the worker to confirm the resolution.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog === "resolve" ? "Resolve grievance" : dialog === "accept" ? "Accept resolution" : "Reopen grievance"}
            </DialogTitle>
            <DialogDescription>
              {dialog === "resolve"
                ? "Describe what was done. The worker is asked to confirm."
                : dialog === "accept"
                  ? "Optionally tell the employer how it was handled."
                  : "Explain what is still wrong."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="dialog-text">{dialog === "resolve" ? "Resolution details" : dialog === "accept" ? "Feedback (optional)" : "Reason"}</Label>
            <Textarea id="dialog-text" value={dialogText} onChange={(e) => setDialogText(e.target.value)} />
            {actionError && <p className="text-sm text-red-600">{actionError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              disabled={busy || (dialog !== "accept" && !dialogText.trim())}
              onClick={() =>
                patch(
                  dialog === "resolve"
                    ? { status: "Resolved", resolution: dialogText }
                    : dialog === "accept"
                      ? { acknowledge: true, feedback: dialogText }
                      : { reopen: true, message: dialogText },
                )
              }
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
