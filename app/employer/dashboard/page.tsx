"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Building2, MapPin, Users, AlertCircle, Plus, Briefcase, IndianRupee } from "lucide-react"
import { useSession } from "@/components/session-provider"
import { inr, timeAgo, useApi } from "@/lib/api"

export default function EmployerDashboard() {
  const { user: employer } = useSession()
  const jobs = useApi<{ jobs: any[] }>("/api/jobs?mine=1")
  const apps = useApi<{ applications: any[] }>("/api/applications")
  const grievances = useApi<{ grievances: any[] }>("/api/grievances")
  const wages = useApi<{ employments: any[]; records: any[] }>("/api/wages")

  const postedJobs = jobs.data?.jobs || []
  const activeJobs = postedJobs.filter((j) => j.status === "Active")
  const applications = apps.data?.applications || []
  const newApplicants = applications.filter((a) => a.status === "New")
  const openGrievances = (grievances.data?.grievances || []).filter((g) => g.status !== "Resolved")
  const workforce = (wages.data?.employments || []).filter((e) => e.status === "Active")
  const pendingWages = (wages.data?.records || []).filter((r) => r.status === "Pending")
  const overdue = pendingWages.filter((r) => new Date(r.dueDate) < new Date())

  const stats = [
    { label: "Active jobs", value: activeJobs.length, icon: Briefcase, href: "/employer/jobs" },
    { label: "New applicants", value: newApplicants.length, icon: Users, href: "/employer/applicants" },
    { label: "Open grievances", value: openGrievances.length, icon: AlertCircle, href: "/employer/grievances" },
    {
      label: overdue.length ? `Wages overdue (${overdue.length})` : "Wages pending",
      value: inr(pendingWages.reduce((s, r) => s + r.amount, 0)),
      icon: IndianRupee,
      href: "/employer/wages",
      alert: overdue.length > 0,
    },
  ]

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Employer Dashboard</h2>
          <p className="text-muted-foreground">Welcome back, {employer.contactPerson}</p>
        </div>
        <Link href="/employer/jobs/create">
          <Button className="w-full md:w-auto">
            <Plus className="mr-2 h-4 w-4" /> Post New Job
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-4 py-4">
          <Avatar className="h-16 w-16">
            {employer.logo && <AvatarImage src={employer.logo} alt={employer.companyName} />}
            <AvatarFallback>
              <Building2 className="h-8 w-8" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle>{employer.companyName}</CardTitle>
            <CardDescription>
              ID: {employer.id} · {employer.industry || "Industry not set"} · {workforce.length} worker(s) employed
            </CardDescription>
            {employer.location && (
              <div className="flex items-center mt-1 text-sm text-muted-foreground">
                <MapPin className="mr-1 h-3 w-3" /> {employer.location}
              </div>
            )}
          </div>
          <Link href="/employer/profile">
            <Button variant="outline" size="sm">
              Company Profile
            </Button>
          </Link>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className={`hover:bg-muted/50 ${s.alert ? "border-red-400" : ""}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className={`text-sm font-medium ${s.alert ? "text-red-600" : ""}`}>{s.label}</CardTitle>
                <s.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="text-2xl font-bold">{s.value}</CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Your Job Postings</CardTitle>
            <CardDescription>Most recent first</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!jobs.loading && postedJobs.length === 0 && <p className="text-sm text-muted-foreground">No jobs posted yet.</p>}
            {postedJobs.slice(0, 4).map((job) => (
              <div key={job.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="font-medium">{job.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {job.location} · posted {timeAgo(job.postedAt)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={job.status === "Active" ? "default" : "secondary"}>{job.status}</Badge>
                  <Link href={`/employer/jobs/${job.id}/applicants`}>
                    <Button size="sm" variant="outline">
                      {job.applicants} applicant(s)
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <Link href="/employer/jobs" className="w-full">
              <Button variant="outline" className="w-full">
                Manage Jobs
              </Button>
            </Link>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Applicants</CardTitle>
            <CardDescription>Waiting for your review</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!apps.loading && newApplicants.length === 0 && <p className="text-sm text-muted-foreground">No new applicants.</p>}
            {newApplicants.slice(0, 4).map((a) => (
              <Link
                key={a.id}
                href={`/employer/jobs/${a.jobId}/applicants?applicant=${a.id}`}
                className="block rounded-lg border p-3 hover:bg-muted/50"
              >
                <div className="font-medium">{a.worker?.name}</div>
                <div className="text-sm text-muted-foreground">
                  {a.job?.title} · {timeAgo(a.appliedAt)}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(a.worker?.skills || []).slice(0, 3).map((s: string) => (
                    <Badge key={s} variant="secondary" className="text-xs">
                      {s}
                    </Badge>
                  ))}
                </div>
              </Link>
            ))}
          </CardContent>
          <CardFooter>
            <Link href="/employer/applicants" className="w-full">
              <Button variant="outline" className="w-full">
                All Applicants
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Open Grievances</CardTitle>
            <CardDescription>Respond quickly: unresolved grievances can be escalated to the labour department</CardDescription>
          </div>
          <AlertCircle className="h-5 w-5 text-orange-500" />
        </CardHeader>
        <CardContent className="space-y-3">
          {!grievances.loading && openGrievances.length === 0 && <p className="text-sm text-muted-foreground">No open grievances.</p>}
          {openGrievances.slice(0, 4).map((g) => (
            <Link key={g.id} href={`/employer/grievances/${g.id}`} className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50">
              <div>
                <div className="font-medium">{g.title}</div>
                <div className="text-sm text-muted-foreground">
                  {g.workerName} · {g.type} · filed {timeAgo(g.filedAt)}
                </div>
              </div>
              <Badge variant={g.status === "New" ? "destructive" : "outline"}>{g.status}</Badge>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
