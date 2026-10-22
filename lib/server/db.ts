import fs from "node:fs"
import path from "node:path"
import type { AppNotification, Database, NotificationType } from "@/lib/types"
import { createSeed } from "./seed"

// Local JSON-file persistence. The whole database is small, so it is kept in
// memory and written back atomically after every mutation. The file location
// can be changed with MC_DATA_FILE (default: ./.data/db.json).

const DATA_FILE = path.resolve(process.env.MC_DATA_FILE || path.join(process.cwd(), ".data", "db.json"))

const globalForDb = globalThis as unknown as { __mcDb?: Database }

function load(): Database {
  if (globalForDb.__mcDb) return globalForDb.__mcDb
  let db: Database
  try {
    db = JSON.parse(fs.readFileSync(DATA_FILE, "utf8")) as Database
  } catch {
    db = createSeed()
    persist(db)
  }
  globalForDb.__mcDb = db
  return db
}

function persist(db: Database) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true })
  const tmp = `${DATA_FILE}.${process.pid}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2))
  fs.renameSync(tmp, DATA_FILE)
}

/** Read-only access to the current database snapshot. */
export function readDb(): Database {
  return load()
}

/** Run a mutation and persist the result. */
export function mutate<T>(fn: (db: Database) => T): T {
  const db = load()
  try {
    const result = fn(db)
    persist(db)
    return result
  } catch (err) {
    // Discard any partial in-memory changes; the next read reloads from disk.
    globalForDb.__mcDb = undefined
    throw err
  }
}

/** Reset the store to seed data (used by `npm run db:reset` via the API in dev). */
export function resetDb() {
  const db = createSeed()
  globalForDb.__mcDb = db
  persist(db)
}

export function nextId(db: Database, counter: string, prefix: string): string {
  db.counters[counter] = (db.counters[counter] || 0) + 1
  return `${prefix}-${db.counters[counter]}`
}

export function nowIso() {
  return new Date().toISOString()
}

export function notify(
  db: Database,
  userId: string | undefined,
  type: NotificationType,
  title: string,
  message: string,
  link: string,
) {
  if (!userId) return
  const n: AppNotification = {
    id: nextId(db, "notification", "NTF"),
    userId,
    type,
    title,
    message,
    link,
    read: false,
    createdAt: nowIso(),
  }
  db.notifications.unshift(n)
}
