"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, AlertCircle, MessageSquare, Plus, CheckCircle, ChevronDown, ChevronUp } from "lucide-react"
import { fmtDate, useApi } from "@/lib/api"

const statusVariant = (s: string) => (s === "Resolved" ? "default" : s === "New" ? "secondary" : "outline")

function GrievanceCard({ g }: { g: any }) {
  const [expanded, setExpanded] = useState(false)
  const last = g.messages[g.messages.length - 1]
  const awaitingYou = g.status === "Resolved" && !g.acknowledged
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-2">
          <div>
            <CardTitle className="text-lg">{g.title}</CardTitle>
            <CardDescription>
              {g.employerName} · {g.type} · {g.id}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={statusVariant(g.status)}>{g.status}</Badge>
            {awaitingYou && <Badge variant="destructive">Confirm resolution</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex gap-4 text-muted-foreground">
          <span>Filed {fmtDate(g.filedAt)}</span>
          <span>Updated {fmtDate(g.updatedAt)}</span>
        </div>
        <p className={expanded ? "" : "line-clamp-2"}>{g.description}</p>
        {g.description.length > 140 && (
          <button className="flex items-center gap-1 text-xs text-primary" onClick={() => setExpanded(!expanded)}>
            {expanded ? (
              <>
                Show less <ChevronUp className="h-3 w-3" />
              </>
            ) : (
              <>
                Show more <ChevronDown className="h-3 w-3" />
              </>
            )}
          </button>
        )}
        {g.resolution && (
          <div className="rounded-md bg-green-50 p-2 text-green-800 dark:bg-green-950 dark:text-green-200">
            <span className="font-medium">Resolution:</span> {g.resolution}
          </div>
        )}
        {last && last.from !== "Worker" && g.status !== "Resolved" && (
          <div className="rounded-md bg-muted p-2">
            <span className="font-medium">{last.from}:</span> {last.message}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <MessageSquare className="h-3 w-3" /> {g.messages.length} message(s)
        </span>
        <Link href={`/grievances/${g.id}`}>
          <Button size="sm" variant={awaitingYou ? "default" : "outline"}>
            View & Respond
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}

export default function GrievancesPage() {
  const { data, loading, error } = useApi<{ grievances: any[] }>("/api/grievances")
  const all = data?.grievances || []
  const active = all.filter((g) => g.status !== "Resolved")
  const resolved = all.filter((g) => g.status === "Resolved")

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
          <h2 className="text-3xl font-bold tracking-tight">Grievances</h2>
          <p className="text-muted-foreground">Report problems with wages, safety or working conditions and track them to resolution</p>
        </div>
        <Link href="/grievances/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> File New Grievance
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Open</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{active.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Awaiting employer</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{active.filter((g) => g.messages.at(-1)?.from === "Worker").length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{resolved.length}</CardContent>
        </Card>
      </div>

      {error && <p className="text-red-600">{error}</p>}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
          <TabsTrigger value="resolved">Resolved ({resolved.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="space-y-4">
          {loading && <p className="text-muted-foreground">Loading...</p>}
          {!loading && active.length === 0 && (
            <div className="flex flex-col items-center py-10 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mb-2" />
              <h3 className="text-lg font-medium">No active grievances</h3>
              <p className="text-sm text-muted-foreground">If something is wrong at work, file a grievance and the employer is notified.</p>
            </div>
          )}
          {active.map((g) => (
            <GrievanceCard key={g.id} g={g} />
          ))}
        </TabsContent>
        <TabsContent value="resolved" className="space-y-4">
          {!loading && resolved.length === 0 && (
            <div className="flex flex-col items-center py-10 text-center text-muted-foreground">
              <AlertCircle className="h-10 w-10 mb-2" />
              No resolved grievances yet.
            </div>
          )}
          {resolved.map((g) => (
            <GrievanceCard key={g.id} g={g} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}
