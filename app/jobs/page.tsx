"use client"

import { useState } from "react"
import { inr, timeAgo, useApi } from "@/lib/api"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { MapPin, Building2, Calendar, IndianRupee, Search, ArrowLeft } from "lucide-react"

export default function JobsPage() {
  const { data, loading, error } = useApi<{ jobs: any[] }>("/api/jobs")
  const jobListings = (data?.jobs || []).map((job) => ({
    ...job,
    salary: `${inr(job.salaryMin)} - ${inr(job.salaryMax)}/month`,
    postedDate: timeAgo(job.postedAt),
  }))

  // State for search and filters
  const [searchTerm, setSearchTerm] = useState("")
  const [salaryRange, setSalaryRange] = useState([10000, 30000])
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>([])
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])

  // Extract unique locations, job types, and skills for filters
  const locations = Array.from(new Set(jobListings.map((job) => job.location)))
  const jobTypes = Array.from(new Set(jobListings.map((job) => job.type)))
  const skills = Array.from(new Set(jobListings.flatMap((job) => job.skills)))

  // Filter jobs based on search and filters
  const filteredJobs = jobListings.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.company.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesLocation = selectedLocations.length === 0 || selectedLocations.includes(job.location)

    const matchesJobType = selectedJobTypes.length === 0 || selectedJobTypes.includes(job.type)

    const matchesSkills = selectedSkills.length === 0 || job.skills.some((skill: string) => selectedSkills.includes(skill))

    // Extract numeric salary range for comparison
    const avgSalary = (job.salaryMin + job.salaryMax) / 2

    const matchesSalary = avgSalary >= salaryRange[0] && avgSalary <= salaryRange[1]

    return matchesSearch && matchesLocation && matchesJobType && matchesSkills && matchesSalary
  })

  // Toggle location filter
  const toggleLocation = (location: string) => {
    setSelectedLocations((prev) =>
      prev.includes(location) ? prev.filter((loc) => loc !== location) : [...prev, location],
    )
  }

  // Toggle job type filter
  const toggleJobType = (type: string) => {
    setSelectedJobTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]))
  }

  // Toggle skill filter
  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) => (prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]))
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <h2 className="text-3xl font-bold tracking-tight">Find Jobs</h2>
        <p className="text-muted-foreground">Search and apply for jobs that match your skills</p>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <div className="space-y-6 md:col-span-1">
          <div className="space-y-4">
            <h3 className="font-medium">Filters</h3>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Salary Range</h4>
              <div className="space-y-4">
                <Slider defaultValue={salaryRange} min={5000} max={50000} step={1000} onValueChange={setSalaryRange} />
                <div className="flex items-center justify-between text-sm">
                  <span>₹{salaryRange[0].toLocaleString()}</span>
                  <span>₹{salaryRange[1].toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Location</h4>
              <div className="space-y-2">
                {locations.map((location) => (
                  <div key={location} className="flex items-center space-x-2">
                    <Checkbox
                      id={`location-${location}`}
                      checked={selectedLocations.includes(location)}
                      onCheckedChange={() => toggleLocation(location)}
                    />
                    <Label htmlFor={`location-${location}`}>{location}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Job Type</h4>
              <div className="space-y-2">
                {jobTypes.map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={`type-${type}`}
                      checked={selectedJobTypes.includes(type)}
                      onCheckedChange={() => toggleJobType(type)}
                    />
                    <Label htmlFor={`type-${type}`}>{type}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Skills</h4>
              <div className="space-y-2">
                {skills.map((skill) => (
                  <div key={skill} className="flex items-center space-x-2">
                    <Checkbox
                      id={`skill-${skill}`}
                      checked={selectedSkills.includes(skill)}
                      onCheckedChange={() => toggleSkill(skill)}
                    />
                    <Label htmlFor={`skill-${skill}`}>{skill}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-3">
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search jobs by title or company..."
                className="w-full appearance-none bg-background pl-8 shadow-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-10 text-muted-foreground">Loading jobs...</div>
            ) : error ? (
              <div className="text-center py-10 text-red-600">{error}</div>
            ) : filteredJobs.length > 0 ? (
              filteredJobs.map((job) => (
                <Card key={job.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between">
                      <CardTitle>{job.title}</CardTitle>
                      <Badge>{job.type}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="space-y-2">
                      <div className="flex items-center text-sm">
                        <Building2 className="mr-1 h-4 w-4 text-muted-foreground" />
                        {job.company}
                      </div>
                      <div className="flex items-center text-sm">
                        <MapPin className="mr-1 h-4 w-4 text-muted-foreground" />
                        {job.location}
                      </div>
                      <div className="flex items-center text-sm">
                        <IndianRupee className="mr-1 h-4 w-4 text-muted-foreground" />
                        {job.salary}
                      </div>
                      <div className="flex items-center text-sm">
                        <Calendar className="mr-1 h-4 w-4 text-muted-foreground" />
                        Posted {job.postedDate}
                      </div>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {job.skills.map((skill: string) => (
                          <Badge key={skill} variant="secondary">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <div className="text-sm text-muted-foreground">
                      {job.applied ? (
                        <Badge variant="outline">Applied</Badge>
                      ) : (
                        `Apply before ${new Date(job.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
                      )}
                    </div>
                    <Link href={`/jobs/${job.id}`}>
                      <Button>View Details</Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <div className="text-center py-10">
                <h3 className="text-lg font-medium">No jobs found</h3>
                <p className="text-muted-foreground mt-1">Try adjusting your search or filters</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
