import { mutate, notify, nowIso } from "@/lib/server/db"
import { HttpError, handle, json, readBody, requireEmployer, str } from "@/lib/server/auth"

const METHODS = ["Bank Transfer", "UPI", "Cash", "Cheque"]

// PATCH /api/wages/:id { status: "Paid", method, transactionId? } — employer marks a wage entry paid
export function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params
    const employer = await requireEmployer()
    const body = await readBody<Record<string, unknown>>(req)
    if (body.status !== "Paid") throw new HttpError(400, "Only marking as Paid is supported")
    const method = str(body.method, "Payment method", { max: 40 })
    if (!METHODS.includes(method)) throw new HttpError(400, "Select a valid payment method")
    const transactionId = str(body.transactionId, "Transaction ID", { required: false, max: 60 })

    const record = mutate((db) => {
      const w = db.wages.find((x) => x.id === id && x.employerId === employer.id)
      if (!w) throw new HttpError(404, "Wage record not found")
      if (w.status === "Paid") throw new HttpError(409, "Already marked as paid")
      w.status = "Paid"
      w.paidAt = nowIso()
      w.method = method
      w.transactionId = transactionId || undefined
      notify(db, w.workerId, "wage", "Wage Paid", `₹${w.amount.toLocaleString("en-IN")} for ${w.period} was paid by ${method}.`, "/wages")
      // A wage dispute about this entry can now be resolved.
      for (const g of db.grievances.filter((g) => g.wageRecordId === w.id && g.status !== "Resolved")) {
        g.status = "Resolved"
        g.resolvedAt = w.paidAt
        g.updatedAt = w.paidAt
        g.resolution = `Payment of ₹${w.amount.toLocaleString("en-IN")} made by ${method}${transactionId ? ` (ref ${transactionId})` : ""}.`
        g.messages.push({ from: "Employer", message: `Resolved: ${g.resolution}`, at: w.paidAt })
        notify(db, g.workerId, "grievance", "Grievance Resolved", `Your grievance '${g.title}' was resolved: wages paid.`, `/grievances/${g.id}`)
      }
      return w
    })
    return json({ record })
  })
}
