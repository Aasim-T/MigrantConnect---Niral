import { readDb } from "@/lib/server/db"
import { currentUser, handle, json } from "@/lib/server/auth"
import { evaluateEligibility } from "@/lib/server/views"

export const dynamic = "force-dynamic"

// GET /api/welfare — schemes, with eligibility + application status for the logged-in worker
export function GET() {
  return handle(async () => {
    const user = await currentUser()
    const db = readDb()
    const worker = user?.role === "worker" ? user : null
    const mine = worker ? db.welfareApplications.filter((a) => a.workerId === worker.id) : []
    const schemes = db.schemes.map((s) => ({
      ...s,
      eligibility_check: worker ? evaluateEligibility(db, worker, s) : null,
      application: mine.find((a) => a.schemeId === s.id)
        ? (({ documents, ...rest }) => ({ ...rest, documentCount: documents.length }))(mine.find((a) => a.schemeId === s.id)!)
        : null,
    }))
    return json({ schemes })
  })
}
