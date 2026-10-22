"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { api, inr, timeAgo, useApi } from "@/lib/api"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Plus, Search, MapPin, Users, Calendar, Clock, CheckCircle } from "lucide-react"
import { motion } from "framer-motion"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function EmployerJobsPage() {
  const router = useRouter()
  const { data, loading, reload, setData } = useApi<{ jobs: any[] }>("/api/jobs?mine=1")
  const jobs = (data?.jobs || []).map((job) => ({
    ...job,
    salary: `${inr(job.salaryMin)} - ${inr(job.salaryMax)}/month`,
    postedDate: timeAgo(job.postedAt),
  }))
  const [operationError, setOperationError] = useState<string | null>(null)

  // State for search and filters
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const [selectedJob, setSelectedJob] = useState<any>(null)
  const [showJobOptions, setShowJobOptions] = useState(false)
  const [operationSuccess, setOperationSuccess] = useState(false)
  const [operationMessage, setOperationMessage] = useState("")

  const handleJobOperation = async (operation: string) => {
    if (!selectedJob) return
    setOperationError(null)
    if (operation === "modify") {
      router.push(`/employer/jobs/create?edit=${selectedJob.id}`)
      return
    }
    try {
      if (operation === "close") {
        const status = selectedJob.status === "Active" ? "Closed" : "Active"
        await api(`/api/jobs/${selectedJob.id}`, { method: "PATCH", body: { status } })
        setOperationMessage(status === "Closed" ? "Job has been closed" : "Job has been activated")
      } else if (operation === "delete") {
        await api(`/api/jobs/${selectedJob.id}`, { method: "DELETE" })
        setData((d) => (d ? { jobs: d.jobs.filter((j) => j.id !== selectedJob.id) } : d))
        setOperationMessage("Job has been deleted")
      }
      setShowJobOptions(false)
      setOperationSuccess(true)
      reload()
    } catch (e) {
      setOperationError((e as Error).message)
    }
  }

  // Filter jobs based on search and filters
  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.location.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || job.status.toLowerCase() === statusFilter.toLowerCase()

    return matchesSearch && matchesStatus
  })

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  }

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  return (
    <motion.div
      className="flex-1 space-y-4 p-8 pt-6 dark:bg-gray-900"
      initial="hidden"
      animate="visible"
      variants={fadeIn}
    >
      <div>
        <Link
          href="/employer/dashboard"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2 dark:text-gray-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight dark:text-white">Manage Jobs</h2>
            <p className="text-muted-foreground dark:text-gray-400">Create and manage job postings</p>
          </div>
          <Link href="/employer/jobs/create">
            <Button className="gap-1">
              <Plus className="h-4 w-4" /> Post New Job
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground dark:text-gray-400" />
          <Input
            type="search"
            placeholder="Search jobs by title or location..."
            className="w-full pl-8 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] dark:bg-gray-800 dark:border-gray-700 dark:text-white">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <motion.div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" variants={staggerContainer}>
        {filteredJobs.map((job) => (
          <motion.div key={job.id} variants={fadeIn} whileHover={{ y: -5 }}>
            <Card className="h-full dark:bg-gray-800 dark:border-gray-700 hover:shadow-md transition-shadow duration-300">
              <CardHeader>
                <div className="flex justify-between">
                  <CardTitle className="dark:text-white">{job.title}</CardTitle>
                  <Badge
                    variant={job.status === "Active" ? "default" : "secondary"}
                    className="dark:bg-gray-700 dark:text-gray-200"
                  >
                    {job.status}
                  </Badge>
                </div>
                <CardDescription className="dark:text-gray-400">{job.salary}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center text-sm text-muted-foreground dark:text-gray-400">
                  <MapPin className="mr-1 h-4 w-4" /> {job.location}
                </div>
                <div className="flex items-center text-sm text-muted-foreground dark:text-gray-400">
                  <Clock className="mr-1 h-4 w-4" /> {job.type}
                </div>
                <div className="flex items-center text-sm text-muted-foreground dark:text-gray-400">
                  <Users className="mr-1 h-4 w-4" /> {job.applicants} applicants
                </div>
                <div className="flex items-center text-sm text-muted-foreground dark:text-gray-400">
                  <Calendar className="mr-1 h-4 w-4" /> Posted {job.postedDate}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between gap-2">
                <Link href={`/employer/jobs/${job.id}/applicants`}>
                  <Button variant="outline" size="sm" className="dark:border-gray-600 dark:text-gray-300">
                    View Applicants
                  </Button>
                </Link>
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedJob(job)
                    setShowJobOptions(true)
                  }}
                >
                  Manage
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {loading && <p className="text-muted-foreground">Loading jobs...</p>}
      {!loading && filteredJobs.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium dark:text-white">No jobs found</h3>
          <p className="text-muted-foreground dark:text-gray-400 mt-1">
            Try adjusting your search or create a new job posting
          </p>
          <Link href="/employer/jobs/create" className="mt-4 inline-block">
            <Button className="gap-1">
              <Plus className="h-4 w-4" /> Post New Job
            </Button>
          </Link>
        </div>
      )}

      {/* Job Management Dialog */}
      <Dialog open={showJobOptions} onOpenChange={setShowJobOptions}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Job: {selectedJob?.title}</DialogTitle>
            <DialogDescription>Select an action to perform on this job posting</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Button onClick={() => handleJobOperation("modify")} className="w-full">
              Modify Job Details
            </Button>
            <Button
              onClick={() => handleJobOperation("close")}
              variant={selectedJob?.status === "Active" ? "destructive" : "default"}
              className="w-full"
            >
              {selectedJob?.status === "Active" ? "Close Job" : "Activate Job"}
            </Button>
            <Button onClick={() => handleJobOperation("delete")} variant="outline" className="w-full">
              Delete Job
            </Button>
            {operationError && <p className="text-sm text-red-600">{operationError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowJobOptions(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Operation Success Dialog */}
      <Dialog open={operationSuccess} onOpenChange={setOperationSuccess}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Operation Successful</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <p className="text-center text-lg">{operationMessage}</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setOperationSuccess(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
