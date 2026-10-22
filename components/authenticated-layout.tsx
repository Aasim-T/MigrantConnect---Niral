"use client"

import type React from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { SessionProvider } from "@/components/session-provider"
import { Toaster } from "@/components/ui/toaster"

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SessionProvider>
      <div className="flex min-h-screen">
        <AppSidebar />
        <main className="flex-1 ml-0 md:ml-64 transition-all duration-300 min-h-screen">{children}</main>
      </div>
      <Toaster />
    </SessionProvider>
  )
}
