"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { MapPin, AlertCircle, Search, ArrowRight, IndianRupee, Briefcase } from "lucide-react"
import { useSession } from "@/components/session-provider"
import { inr, timeAgo, useApi } from "@/lib/api"

const initials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)

export default function WorkerDashboard() {
  const { user: worker } = useSession()
  const jobs = useApi<{ jobs: any[] }>("/api/jobs?recommended=1")
  const apps = useApi<{ applications: any[] }>("/api/applications")
  const grievances = useApi<{ grievances: any[] }>("/api/grievances")
  const wages = useApi<{ employments: any[] }>("/api/wages")
  const welfare = useApi<{ schemes: any[] }>("/api/welfare")

  const activeApps = (apps.data?.applications || []).filter((a) => a.status !== "Rejected").slice(0, 3)
  const openGrievances = (grievances.data?.grievances || []).filter((g) => g.status !== "Resolved").slice(0, 3)
  const eligibleSchemes = (welfare.data?.schemes || []).filter((s) => s.eligibility_check?.eligible && !s.application).slice(0, 2)
  const employments = wages.data?.employments || []
  const pending = employments.reduce((s, e) => s + e.pendingAmount, 0)
  const paid = employments.reduce((s, e) => s + e.totalPaid, 0)

  const completion = Math.round(
    ([worker.name, worker.dob, worker.phone, worker.address, worker.location, worker.education, worker.photo].filter(Boolean).length +
      (worker.skills?.length ? 1 : 0) +
      (worker.languages?.length ? 1 : 0)) *
      (100 / 9),
  )

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Worker Dashboard</h2>
          <p className="text-muted-foreground">Welcome back, {worker.name}</p>
        </div>
        <Link href="/jobs">
          <Button className="w-full md:w-auto">
            <Search className="mr-2 h-4 w-4" /> Find Jobs
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader className="flex flex-row items-center gap-4">
            <Avatar className="h-16 w-16">
              {worker.photo && <AvatarImage src={worker.photo} alt={worker.name} />}
              <AvatarFallback>{initials(worker.name)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>{worker.name}</CardTitle>
              <CardDescription>ID: {worker.id}</CardDescription>
              {worker.location && (
                <div className="flex items-center mt-1 text-sm text-muted-foreground">
                  <MapPin className="mr-1 h-3 w-3" /> {worker.location}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {worker.skills.map((skill: string) => (
                <Badge key={skill} variant="secondary">
                  {skill}
                </Badge>
              ))}
            </div>
            <div className="text-xs text-muted-foreground">Profile {Math.min(100, completion)}% complete</div>
            <div className="h-2 rounded bg-muted">
              <div className="h-2 rounded bg-primary" style={{ width: `${Math.min(100, completion)}%` }} />
            </div>
          </CardContent>
          <CardFooter>
            <Link href="/profile">
              <Button variant="outline" size="sm">
                View Full Profile
              </Button>
            </Link>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Wages</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {wages.loading ? (
              <Skeleton className="h-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{inr(paid)}</div>
                <p className="text-xs text-muted-foreground">received so far</p>
                <div className="mt-3 text-sm">
                  Pending: <span className={pending ? "font-semibold text-orange-600" : ""}>{inr(pending)}</span>
                </div>
              </>
            )}
          </CardContent>
          <CardFooter>
            <Link href="/wages" className="w-full">
              <Button variant="outline" className="w-full" size="sm">
                Wage details
              </Button>
            </Link>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Current Work</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            {employments.filter((e) => e.status === "Active").length === 0 ? (
              <p className="text-sm text-muted-foreground">Not currently employed through MigrantConnect.</p>
            ) : (
              employments
                .filter((e) => e.status === "Active")
                .map((e) => (
                  <div key={e.id} className="text-sm">
                    <div className="font-medium">{e.title}</div>
                    <div className="text-muted-foreground">
                      {e.employerName} · {inr(e.dailyWage)}/day
                    </div>
                  </div>
                ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Job Recommendations</CardTitle>
            <CardDescription>Based on your skills and location</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {jobs.loading && <Skeleton className="h-24" />}
            {!jobs.loading && (jobs.data?.jobs.length || 0) === 0 && (
              <p className="text-sm text-muted-foreground">No new jobs match your skills right now. Add more skills in your profile.</p>
            )}
            {(jobs.data?.jobs || []).slice(0, 3).map((job) => (
              <div key={job.id} className="flex flex-col space-y-2 rounded-lg border p-3">
                <div className="flex justify-between">
                  <div className="font-medium">{job.title}</div>
                  <Badge variant="outline">{timeAgo(job.postedAt)}</Badge>
                </div>
                <div className="text-sm">{job.company}</div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="mr-1 h-3 w-3" /> {job.location}
                </div>
                <div className="text-sm font-medium">
                  {inr(job.salaryMin)} - {inr(job.salaryMax)}/month
                </div>
                <div className="flex justify-end">
                  <Link href={`/jobs/${job.id}`}>
                    <Button size="sm">View Job</Button>
                  </Link>
                </div>
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <Link href="/jobs" className="w-full">
              <Button variant="outline" className="w-full">
                View All Jobs <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Applications</CardTitle>
            <CardDescription>Track your job applications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!apps.loading && activeApps.length === 0 && <p className="text-sm text-muted-foreground">No applications yet.</p>}
            {activeApps.map((a) => (
              <Link key={a.id} href={`/jobs/${a.jobId}`} className="flex flex-col space-y-1 rounded-lg border p-3 hover:bg-muted/50">
                <div className="flex justify-between gap-2">
                  <div className="font-medium">{a.job?.title}</div>
                  <Badge variant={a.status === "Selected" ? "default" : "secondary"}>{a.status}</Badge>
                </div>
                <div className="text-sm">{a.job?.company}</div>
                <div className="text-xs text-muted-foreground">Applied {timeAgo(a.appliedAt)}</div>
              </Link>
            ))}
          </CardContent>
          <CardFooter>
            <Link href="/applications" className="w-full">
              <Button variant="outline" className="w-full">
                View All Applications
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Grievance Status</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4">
            {openGrievances.length > 0 ? (
              openGrievances.map((g) => (
                <Link key={g.id} href={`/grievances/${g.id}`} className="flex flex-col space-y-1 rounded-lg border p-3 hover:bg-muted/50">
                  <div className="flex justify-between gap-2">
                    <div className="font-medium">{g.title}</div>
                    <Badge variant="outline">{g.status}</Badge>
                  </div>
                  <div className="text-sm">{g.employerName}</div>
                  <div className="text-xs text-muted-foreground">Filed {timeAgo(g.filedAt)}</div>
                </Link>
              ))
            ) : (
              <div className="text-center py-4 text-sm text-muted-foreground">No open grievances</div>
            )}
          </CardContent>
          <CardFooter>
            <Link href="/grievances" className="w-full">
              <Button variant="outline" className="w-full">
                View All Grievances
              </Button>
            </Link>
          </CardFooter>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Welfare Schemes</CardTitle>
            <CardDescription>Government schemes you are eligible for</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!welfare.loading && eligibleSchemes.length === 0 && (
              <p className="text-sm text-muted-foreground">No new eligible schemes. Check the full list for details.</p>
            )}
            {eligibleSchemes.map((s) => (
              <div key={s.id} className="rounded-lg border p-3">
                <div className="font-medium">{s.name}</div>
                <div className="text-sm text-muted-foreground mt-1">{s.benefits}</div>
                <div className="mt-2 flex justify-end">
                  <Link href={`/welfare?scheme=${s.id}`}>
                    <Button size="sm">Apply Now</Button>
                  </Link>
                </div>
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <Link href="/welfare" className="w-full">
              <Button variant="outline" className="w-full">
                View All Schemes
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
