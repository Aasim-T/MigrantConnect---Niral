"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/** Error thrown by `api()` with the server's message and HTTP status. */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
  }
}

/** JSON fetch against the app's own API routes. */
export async function api<T = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(path, {
    method: opts.method || (opts.body !== undefined ? "POST" : "GET"),
    headers: opts.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined" && !path.startsWith("/api/auth/")) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`
    }
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status)
  }
  return data as T
}

/** Load data from a GET endpoint; `reload()` refetches, `setData` allows optimistic updates. */
export function useApi<T = any>(path: string | null) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(Boolean(path))
  const latest = useRef(path)
  latest.current = path

  const reload = useCallback(async () => {
    if (!path) return
    setLoading(true)
    try {
      const d = await api<T>(path)
      if (latest.current === path) {
        setData(d)
        setError(null)
      }
    } catch (e) {
      if (latest.current === path) setError((e as Error).message)
    } finally {
      if (latest.current === path) setLoading(false)
    }
  }, [path])

  useEffect(() => {
    reload()
  }, [reload])

  return { data, error, loading, reload, setData }
}

export const inr = (n: number | null | undefined) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`

export const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"

export function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return "just now"
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  const d = Math.floor(s / 86400)
  return d === 1 ? "yesterday" : `${d} days ago`
}

/** Read a File as a data URL (for photo / document uploads). */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })
}
