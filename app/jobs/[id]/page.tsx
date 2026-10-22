"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { api, fmtDate, inr, timeAgo, useApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ArrowLeft, Building2, MapPin, Calendar, IndianRupee, Clock, CheckCircle } from "lucide-react"

export default function JobDetailsPage() {
  const params = useParams()
  const jobId = params.id as string

  const [applicationNote, setApplicationNote] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [applyError, setApplyError] = useState<string | null>(null)
  const { data, error, loading, reload } = useApi<{ job: any; application: any; similar: any[] }>(`/api/jobs/${jobId}`)

  const handleApply = async () => {
    setIsSubmitting(true)
    setApplyError(null)
    try {
      await api("/api/applications", { body: { jobId, note: applicationNote } })
      setIsSuccess(true)
      reload()
    } catch (e) {
      setApplyError((e as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading && !data) return <div className="p-8 text-muted-foreground">Loading job...</div>
  if (error || !data) {
    return (
      <div className="p-8 space-y-4">
        <p className="text-red-600">{error || "Job not found"}</p>
        <Link href="/jobs">
          <Button variant="outline">Back to jobs</Button>
        </Link>
      </div>
    )
  }

  const job = {
    ...data.job,
    salary: `${inr(data.job.salaryMin)} - ${inr(data.job.salaryMax)}/month`,
    postedDate: timeAgo(data.job.postedAt),
  }
  const application = data.application

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div>
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to jobs
        </Link>
        <h2 className="text-3xl font-bold tracking-tight">{job.title}</h2>
        <div className="flex items-center gap-2 mt-1">
          <Badge>{job.type}</Badge>
          <Badge variant="outline">{job.duration}</Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Job Description</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>{job.description}</p>

              <div className="space-y-2">
                <h4 className="font-medium">Responsibilities:</h4>
                <ul className="list-disc pl-5 space-y-1">
                  {job.responsibilities.map((item: string, index: number) => (
                    <li key={index} className="text-sm">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Requirements:</h4>
                <ul className="list-disc pl-5 space-y-1">
                  {job.requirements.map((item: string, index: number) => (
                    <li key={index} className="text-sm">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Benefits:</h4>
                <ul className="list-disc pl-5 space-y-1">
                  {job.benefits.map((item: string, index: number) => (
                    <li key={index} className="text-sm">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <h4 className="font-medium mr-2">Skills:</h4>
                {job.skills.map((skill: string) => (
                  <Badge key={skill} variant="secondary">
                    {skill}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Company:</span>
                  <span className="ml-2">{job.company}</span>
                </div>
                <div className="flex items-center text-sm">
                  <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Location:</span>
                  <span className="ml-2">{job.location}</span>
                </div>
                <div className="flex items-center text-sm">
                  <IndianRupee className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Salary:</span>
                  <span className="ml-2">{job.salary}</span>
                </div>
                <div className="flex items-center text-sm">
                  <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Working Hours:</span>
                  <span className="ml-2">{job.workingHours}</span>
                </div>
                <div className="flex items-center text-sm">
                  <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Posted:</span>
                  <span className="ml-2">{job.postedDate}</span>
                </div>
                <div className="flex items-center text-sm">
                  <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Apply by:</span>
                  <span className="ml-2">{fmtDate(job.deadline)}</span>
                </div>
                {job.contactPerson && (
                  <div className="text-sm text-muted-foreground">
                    Contact: {job.contactPerson} ({job.contactEmail})
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              {application ? (
                <div className="w-full space-y-2 text-center">
                  <Badge variant={application.status === "Selected" ? "default" : "secondary"}>Application: {application.status}</Badge>
                  <p className="text-sm text-muted-foreground">Applied {timeAgo(application.appliedAt)}</p>
                  <Link href="/applications">
                    <Button variant="outline" className="w-full">
                      View my applications
                    </Button>
                  </Link>
                </div>
              ) : job.status !== "Active" ? (
                <p className="text-sm text-muted-foreground">This job is no longer accepting applications.</p>
              ) : (
                <Dialog onOpenChange={(open) => !open && setIsSuccess(false)}>
                  <DialogTrigger asChild>
                    <Button className="w-full">Apply for this Job</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Apply for {job.title}</DialogTitle>
                      <DialogDescription>Your profile information will be shared with {job.company}</DialogDescription>
                    </DialogHeader>
                    {isSuccess ? (
                      <div className="flex flex-col items-center justify-center py-4 space-y-2">
                        <CheckCircle className="h-16 w-16 text-green-500" />
                        <h3 className="text-xl font-medium">Application Submitted!</h3>
                        <p className="text-center text-muted-foreground">The employer has been notified. Track it under My Applications.</p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium">Add a note to your application (optional)</h4>
                            <Textarea
                              placeholder="Tell the employer why you're a good fit for this job..."
                              value={applicationNote}
                              onChange={(e) => setApplicationNote(e.target.value)}
                            />
                          </div>
                          {applyError && <p className="text-sm text-red-600">{applyError}</p>}
                        </div>
                        <DialogFooter>
                          <Button onClick={handleApply} disabled={isSubmitting}>
                            {isSubmitting ? "Submitting..." : "Submit Application"}
                          </Button>
                        </DialogFooter>
                      </>
                    )}
                  </DialogContent>
                </Dialog>
              )}
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Similar Jobs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.similar.length === 0 && <p className="text-sm text-muted-foreground">No similar jobs right now.</p>}
              {data.similar.map((j) => (
                <div key={j.id} className="space-y-1 border-b pb-2 last:border-0">
                  <div className="font-medium">{j.title}</div>
                  <div className="text-sm">{j.company}</div>
                  <div className="text-sm text-muted-foreground">
                    {j.location} • {inr(j.salaryMin)} - {inr(j.salaryMax)}/month
                  </div>
                  <Link href={`/jobs/${j.id}`}>
                    <Button variant="link" className="px-0">
                      View Job
                    </Button>
                  </Link>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
