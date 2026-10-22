"use client"

import type React from "react"
import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { api } from "@/lib/api"

export type SessionUser = Record<string, any> & { id: string; role: "worker" | "employer" }

type SessionValue = {
  user: SessionUser
  unread: number
  demoMode: boolean
  refresh: () => Promise<void>
  setUser: (u: SessionUser) => void
}

const SessionContext = createContext<SessionValue | null>(null)

export function useSession() {
  const v = useContext(SessionContext)
  if (!v) throw new Error("useSession must be used inside AuthenticatedLayout")
  return v
}

/** Loads the logged-in user; sends visitors to /login and users to their own area (worker vs employer). */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [state, setState] = useState<{ user: SessionUser; unread: number; demoMode: boolean } | null>(null)

  const refresh = useCallback(async () => {
    try {
      const me = await api<{ user: SessionUser; unreadNotifications: number; demoMode: boolean }>("/api/auth/me")
      setState({ user: me.user, unread: me.unreadNotifications, demoMode: me.demoMode })
    } catch {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`)
    }
  }, [router, pathname])

  useEffect(() => {
    refresh()
  }, [refresh])

  const role = state?.user.role
  const wrongArea = role && (role === "employer") !== pathname.startsWith("/employer")
  useEffect(() => {
    if (wrongArea) router.replace(role === "employer" ? "/employer/dashboard" : "/dashboard")
  }, [wrongArea, role, router])

  if (!state || wrongArea) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <SessionContext.Provider value={{ ...state, refresh, setUser: (user) => setState((s) => (s ? { ...s, user } : s)) }}>
      {children}
    </SessionContext.Provider>
  )
}
