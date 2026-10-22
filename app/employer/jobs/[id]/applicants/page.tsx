"use client"

import { Suspense } from "react"
import { useParams } from "next/navigation"
import { ApplicantsView } from "@/components/applicants-view"

export default function JobApplicantsPage() {
  const { id } = useParams<{ id: string }>()
  return (
    <Suspense>
      <ApplicantsView jobId={id} />
    </Suspense>
  )
}
