"use client"

import { useParams } from "next/navigation"
import { GrievanceDetail } from "@/components/grievance-detail"

export default function EmployerGrievanceDetailsPage() {
  const { id } = useParams<{ id: string }>()
  return <GrievanceDetail id={id} />
}
