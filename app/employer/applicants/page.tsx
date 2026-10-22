"use client"

import { Suspense } from "react"
import { ApplicantsView } from "@/components/applicants-view"

export default function EmployerApplicantsPage() {
  return (
    <Suspense>
      <ApplicantsView />
    </Suspense>
  )
}
