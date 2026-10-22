"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, CheckCircle, Clock, MessageSquare, Search } from "lucide-react"
import { fmtDate, inr, timeAgo, useApi } from "@/lib/api"

function Row({ g }: { g: any }) {
  const waiting = g.messages.at(-1)?.from === "Worker" && g.status !== "Resolved"
  const ageDays = Math.floor((Date.now() - new Date(g.filedAt).getTime()) / 86400000)
  return (
    <Card className={g.status === "New" ? "border-orange-300" : ""}>
      <CardHeader className="pb-2">
        <div className="flex justify-between gap-2">
          <div>
            <CardTitle className="text-lg">{g.title}</CardTitle>
            <CardDescription>
              {g.workerName} ({g.workerId}) · {g.type} · {g.id}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={g.status === "Resolved" ? "default" : g.status === "New" ? "destructive" : "outline"}>{g.status}</Badge>
            {waiting && <Badge variant="secondary">Awaiting your reply</Badge>}
            {g.status === "Resolved" && (g.acknowledged ? <Badge variant="outline">Accepted</Badge> : <Badge variant="secondary">Awaiting worker</Badge>)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="line-clamp-2">{g.description}</p>
        <div className="flex flex-wrap gap-4 text-muted-foreground">
          <span>Filed {fmtDate(g.filedAt)}</span>
          {g.jobTitle && <span>Job: {g.jobTitle}</span>}
          {g.amountDue != null && <span>Amount: {inr(g.amountDue)}</span>}
          {g.status !== "Resolved" && ageDays >= 7 && (
            <span className="flex items-center gap-1 text-red-600">
              <Clock className="h-3 w-3" /> Open {ageDays} days
            </span>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <MessageSquare className="h-3 w-3" /> {g.messages.length} message(s) · updated {timeAgo(g.updatedAt)}
        </span>
        <Link href={`/employer/grievances/${g.id}`}>
          <Button size="sm" variant={waiting ? "default" : "outline"}>
            {g.status === "Resolved" ? "View" : "Respond / Resolve"}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}

export default function EmployerGrievancesPage() {
  const { data, loading, error } = useApi<{ grievances: any[] }>("/api/grievances")
  const [search, setSearch] = useState("")
  const all = (data?.grievances || []).filter((g) =>
    `${g.title} ${g.workerName} ${g.type} ${g.id}`.toLowerCase().includes(search.toLowerCase()),
  )
  const active = all.filter((g) => g.status !== "Resolved")
  const resolved = all.filter((g) => g.status === "Resolved")

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div>
        <Link href="/employer/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <h2 className="text-3xl font-bold tracking-tight">Grievances</h2>
        <p className="text-muted-foreground">Grievances raised by your workers. Respond and resolve them on record.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-8" placeholder="Search grievances..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
              <p className="font-medium">No open grievances</p>
            </div>
          )}
          {active.map((g) => (
            <Row key={g.id} g={g} />
          ))}
        </TabsContent>
        <TabsContent value="resolved" className="space-y-4">
          {!loading && resolved.length === 0 && <p className="text-muted-foreground">No resolved grievances yet.</p>}
          {resolved.map((g) => (
            <Row key={g.id} g={g} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}
