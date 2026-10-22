"use client"

import type React from "react"

import { Suspense, useEffect, useState } from "react"
import { api } from "@/lib/api"
import { SKILLS } from "@/lib/validation"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Plus, X, CheckCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

function JobForm() {
  const router = useRouter()
  const editId = useSearchParams().get("edit")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [newJobId, setNewJobId] = useState<string | null>(null)

  const [jobForm, setJobForm] = useState({
    title: "",
    description: "",
    location: "",
    salaryMin: "",
    salaryMax: "",
    type: "",
    duration: "",
    workingHours: "",
    skills: [] as string[],
    responsibilities: [""],
    requirements: [""],
    benefits: [""],
  })

  // Handle form input changes
  const handleInputChange = (field: string, value: string) => {
    setJobForm({
      ...jobForm,
      [field]: value,
    })
  }

  // Handle array field changes
  const handleArrayFieldChange = (field: string, index: number, value: string) => {
    const updatedArray = [...jobForm[field as keyof typeof jobForm]] as string[]
    updatedArray[index] = value

    setJobForm({
      ...jobForm,
      [field]: updatedArray,
    })
  }

  // Add new item to array field
  const addArrayItem = (field: string) => {
    const updatedArray = [...jobForm[field as keyof typeof jobForm]] as string[]
    updatedArray.push("")

    setJobForm({
      ...jobForm,
      [field]: updatedArray,
    })
  }

  // Remove item from array field
  const removeArrayItem = (field: string, index: number) => {
    const updatedArray = [...jobForm[field as keyof typeof jobForm]] as string[]
    updatedArray.splice(index, 1)

    setJobForm({
      ...jobForm,
      [field]: updatedArray,
    })
  }

  // Toggle skill selection
  const toggleSkill = (skill: string) => {
    if (jobForm.skills.includes(skill)) {
      setJobForm({
        ...jobForm,
        skills: jobForm.skills.filter((s) => s !== skill),
      })
    } else {
      setJobForm({
        ...jobForm,
        skills: [...jobForm.skills, skill],
      })
    }
  }

  // Editing an existing job: load it into the form
  useEffect(() => {
    if (!editId) return
    api(`/api/jobs/${editId}`)
      .then(({ job }) =>
        setJobForm({
          title: job.title,
          description: job.description,
          location: job.location,
          salaryMin: String(job.salaryMin),
          salaryMax: String(job.salaryMax),
          type: job.type,
          duration: job.duration,
          workingHours: job.workingHours,
          skills: job.skills,
          responsibilities: job.responsibilities.length ? job.responsibilities : [""],
          requirements: job.requirements.length ? job.requirements : [""],
          benefits: job.benefits.length ? job.benefits : [""],
        }),
      )
      .catch((e) => setError(e.message))
  }, [editId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!jobForm.type) return setError("Select a job type.")
    if (jobForm.skills.length === 0) return setError("Select at least one required skill.")
    setIsSubmitting(true)
    try {
      const r = editId
        ? await api(`/api/jobs/${editId}`, { method: "PATCH", body: jobForm })
        : await api("/api/jobs", { body: jobForm })
      setNewJobId(r.job.id)
      setShowSuccessDialog(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCloseSuccess = () => {
    setShowSuccessDialog(false)
    // Redirect to jobs page
    router.push("/employer/jobs")
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div>
        <Link
          href="/employer/jobs"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to jobs
        </Link>
        <h2 className="text-3xl font-bold tracking-tight">{editId ? "Edit Job" : "Post a New Job"}</h2>
        <p className="text-muted-foreground">
          {editId ? "Update the job posting. Applicants keep their applications." : "Workers with matching skills are notified as soon as you post"}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Enter the basic details about the job</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Job Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Construction Worker"
                  value={jobForm.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Job Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the job role and responsibilities"
                  value={jobForm.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    placeholder="e.g., Delhi"
                    value={jobForm.location}
                    onChange={(e) => handleInputChange("location", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Job Type</Label>
                  <Select value={jobForm.type} onValueChange={(value) => handleInputChange("type", value)}>
                    <SelectTrigger id="type">
                      <SelectValue placeholder="Select job type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Full-time">Full-time</SelectItem>
                      <SelectItem value="Part-time">Part-time</SelectItem>
                      <SelectItem value="Contract">Contract</SelectItem>
                      <SelectItem value="Temporary">Temporary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration</Label>
                  <Select value={jobForm.duration} onValueChange={(value) => handleInputChange("duration", value)}>
                    <SelectTrigger id="duration">
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Short-term">Short-term</SelectItem>
                      <SelectItem value="Long-term">Long-term</SelectItem>
                      <SelectItem value="Project-based">Project-based</SelectItem>
                      <SelectItem value="Permanent">Permanent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workingHours">Working Hours</Label>
                  <Input
                    id="workingHours"
                    placeholder="e.g., 8 hours/day, 6 days/week"
                    value={jobForm.workingHours}
                    onChange={(e) => handleInputChange("workingHours", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="salaryMin">Minimum Salary (₹/month)</Label>
                  <Input
                    id="salaryMin"
                    type="number"
                    placeholder="e.g., 15000"
                    value={jobForm.salaryMin}
                    onChange={(e) => handleInputChange("salaryMin", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salaryMax">Maximum Salary (₹/month)</Label>
                  <Input
                    id="salaryMax"
                    type="number"
                    placeholder="e.g., 18000"
                    value={jobForm.salaryMax}
                    onChange={(e) => handleInputChange("salaryMax", e.target.value)}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Skills & Requirements</CardTitle>
              <CardDescription>Specify the skills and requirements for the job</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Required Skills</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {SKILLS.map((skill) => (
                    <Button
                      key={skill}
                      type="button"
                      variant={jobForm.skills.includes(skill) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleSkill(skill)}
                      className="justify-start"
                    >
                      {skill}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Responsibilities</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addArrayItem("responsibilities")}
                    className="flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" /> Add
                  </Button>
                </div>

                {jobForm.responsibilities.map((responsibility, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder={`Responsibility ${index + 1}`}
                      value={responsibility}
                      onChange={(e) => handleArrayFieldChange("responsibilities", index, e.target.value)}
                    />
                    {jobForm.responsibilities.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeArrayItem("responsibilities", index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Requirements</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addArrayItem("requirements")}
                    className="flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" /> Add
                  </Button>
                </div>

                {jobForm.requirements.map((requirement, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder={`Requirement ${index + 1}`}
                      value={requirement}
                      onChange={(e) => handleArrayFieldChange("requirements", index, e.target.value)}
                    />
                    {jobForm.requirements.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeArrayItem("requirements", index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Benefits</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addArrayItem("benefits")}
                    className="flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" /> Add
                  </Button>
                </div>

                {jobForm.benefits.map((benefit, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder={`Benefit ${index + 1}`}
                      value={benefit}
                      onChange={(e) => handleArrayFieldChange("benefits", index, e.target.value)}
                    />
                    {jobForm.benefits.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeArrayItem("benefits", index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {error && <p className="text-right text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => router.push("/employer/jobs")}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : editId ? "Save Changes" : "Post Job"}
            </Button>
          </div>
        </div>
      </form>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Job Updated" : "Job Posted Successfully"}</DialogTitle>
            <DialogDescription>
              {editId ? "Your changes are live." : `Job ${newJobId} is live and matching workers have been notified.`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-4 space-y-2">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <p className="text-center">You can manage your job postings and view applicants from the Jobs page.</p>
          </div>
          <DialogFooter>
            <Button onClick={handleCloseSuccess}>Go to Jobs</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function CreateJobPage() {
  return (
    <Suspense>
      <JobForm />
    </Suspense>
  )
}
