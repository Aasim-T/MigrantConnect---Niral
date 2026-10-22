"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, Briefcase, AlertCircle, CheckCircle2, IndianRupee, FileText, UserCircle, Trash2 } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useSession } from "@/components/session-provider"
import { api, timeAgo, useApi } from "@/lib/api"

const ICONS: Record<string, React.ReactNode> = {
  application: <CheckCircle2 className="h-5 w-5 text-blue-500" />,
  job: <Briefcase className="h-5 w-5 text-green-500" />,
  grievance: <AlertCircle className="h-5 w-5 text-orange-500" />,
  wage: <IndianRupee className="h-5 w-5 text-emerald-600" />,
  welfare: <FileText className="h-5 w-5 text-purple-500" />,
  profile: <UserCircle className="h-5 w-5 text-gray-500" />,
}

/** Notification inbox shared by the worker and employer areas. */
export function NotificationsView() {
  const router = useRouter()
  const { user, refresh } = useSession()
  const { data, loading, setData } = useApi<{ notifications: any[]; unread: number }>("/api/notifications")
  const [tab, setTab] = useState("all")
  const tabs = user.role === "worker" ? ["all", "unread", "application", "job", "wage", "grievance", "welfare"] : ["all", "unread", "application", "job", "grievance", "wage"]

  const list = (data?.notifications || []).filter((n) => (tab === "all" ? true : tab === "unread" ? !n.read : n.type === tab))
  const unread = (data?.notifications || []).filter((n) => !n.read).length

  const update = (fn: (n: any) => any) =>
    setData((d) => (d ? { ...d, notifications: d.notifications.map(fn) } : d))

  const markAll = async () => {
    update((n) => ({ ...n, read: true }))
    await api("/api/notifications", { method: "PATCH", body: {} })
    refresh()
  }

  const open = async (n: any) => {
    if (!n.read) {
      update((x) => (x.id === n.id ? { ...x, read: true } : x))
      await api("/api/notifications", { method: "PATCH", body: { id: n.id } }).catch(() => {})
      refresh()
    }
    router.push(n.link)
  }

  const remove = async (id: string) => {
    setData((d) => (d ? { ...d, notifications: d.notifications.filter((n) => n.id !== id) } : d))
    await api("/api/notifications", { method: "DELETE", body: { id } }).catch(() => {})
    refresh()
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Notifications</h2>
          <p className="text-muted-foreground">{unread ? `${unread} unread` : "You're all caught up"}</p>
        </div>
        <Button variant="outline" onClick={markAll} disabled={!unread}>
          Mark all as read
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          {tabs.map((t) => (
            <TabsTrigger key={t} value={t} className="capitalize">
              {t}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Recent</CardTitle>
          <CardDescription>Updates about your {user.role === "worker" ? "applications, wages and grievances" : "jobs, applicants and grievances"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading && <p className="text-muted-foreground">Loading...</p>}
          {!loading && list.length === 0 && (
            <div className="flex flex-col items-center py-8 text-muted-foreground">
              <Bell className="h-10 w-10 mb-2" />
              No notifications here.
            </div>
          )}
          {list.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 ${n.read ? "" : "border-primary/40 bg-primary/5"}`}
            >
              <div className="mt-0.5">{ICONS[n.type] || <Bell className="h-5 w-5" />}</div>
              <button className="flex-1 text-left" onClick={() => open(n)}>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{n.title}</span>
                  {!n.read && <Badge className="h-5 px-1.5 text-[10px]">New</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{n.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">{timeAgo(n.createdAt)}</p>
              </button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(n.id)} aria-label="Delete notification">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
