import type { Movement, Session, Settings } from './types'
import type { Repository } from './repository'
import { currentAuth, isConfigured, rest } from './supabase'

/*
 * Cross-device sync: plan on the Mac at night, have it on the phone at the gym.
 *
 * Local IndexedDB stays the source of truth and the app never blocks on the
 * network — sync is a background reconciliation, not a data path. Conflicts
 * resolve last-write-wins on `updatedAt`, which is honest for a single user on
 * two devices and avoids inventing a merge algorithm nobody needs.
 *
 * Inert until VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set at build
 * time. Until then every function here is a no-op.
 */

export type SyncStatus = {
  configured: boolean
  label: string
  detail: string
}

export function syncStatus(): SyncStatus {
  if (!isConfigured()) {
    return {
      configured: false,
      label: 'Off',
      detail:
        'Everything is stored on this device only. Sync needs a Supabase project connected to the build — until then, use an export file to move data between the Mac and your phone.',
    }
  }
  return {
    configured: true,
    label: 'Ready',
    detail: 'Sign in on each device and sessions reconcile automatically.',
  }
}

type Row<T> = { id: string; user_id: string; updated_at: string; payload: T }

function toRow<T extends { id: string; updatedAt: string }>(userId: string, record: T): Row<T> {
  return { id: record.id, user_id: userId, updated_at: record.updatedAt, payload: record }
}

/**
 * Merges two sets of records by id, keeping whichever side was updated last.
 * Returns what each side is missing so the caller can write both directions.
 */
function reconcile<T extends { id: string; updatedAt: string }>(
  local: T[],
  remote: T[],
): { toLocal: T[]; toRemote: T[] } {
  const remoteById = new Map(remote.map((r) => [r.id, r]))
  const localById = new Map(local.map((r) => [r.id, r]))

  const toLocal: T[] = []
  const toRemote: T[] = []

  for (const record of local) {
    const counterpart = remoteById.get(record.id)
    if (!counterpart || record.updatedAt > counterpart.updatedAt) toRemote.push(record)
  }
  for (const record of remote) {
    const counterpart = localById.get(record.id)
    if (!counterpart || record.updatedAt > counterpart.updatedAt) toLocal.push(record)
  }

  return { toLocal, toRemote }
}

async function pull<T>(table: string): Promise<T[]> {
  const rows = await rest<Row<T>[]>(`${table}?select=payload`)
  return (rows ?? []).map((row) => row.payload)
}

async function push<T extends { id: string; updatedAt: string }>(
  table: string,
  userId: string,
  records: T[],
): Promise<void> {
  if (records.length === 0) return
  await rest(table, {
    method: 'POST',
    prefer: 'resolution=merge-duplicates',
    body: JSON.stringify(records.map((record) => toRow(userId, record))),
  })
}

/**
 * One full reconciliation pass. Safe to call on launch and after mutations;
 * failures are surfaced to the caller rather than retried, because the local
 * copy is already correct and the next pass will pick things up.
 */
export async function syncNow(repository: Repository): Promise<{ pulled: number; pushed: number }> {
  if (!isConfigured()) return { pulled: 0, pushed: 0 }

  const auth = await currentAuth()
  if (!auth) return { pulled: 0, pushed: 0 }
  const userId = auth.user.id

  const [localMovements, localSessions, localSettings] = await Promise.all([
    repository.listMovements(),
    repository.listSessions(),
    repository.getSettings(),
  ])

  const [remoteMovements, remoteSessions] = await Promise.all([
    pull<Movement>('movements'),
    pull<Session>('sessions'),
  ])

  const movements = reconcile(localMovements, remoteMovements)
  const sessions = reconcile(localSessions, remoteSessions)

  await Promise.all([
    ...movements.toLocal.map((m) => repository.putMovement(m)),
    ...sessions.toLocal.map((s) => repository.putSession(s)),
  ])

  await Promise.all([
    push('movements', userId, movements.toRemote),
    push('sessions', userId, sessions.toRemote),
  ])

  // Settings are a single row rather than a collection, so they reconcile on
  // their own rather than going through the id-keyed path above.
  if (localSettings) {
    const remoteSettings = await pull<Settings>('settings')
    const theirs = remoteSettings[0]
    if (!theirs || localSettings.updatedAt > theirs.updatedAt) {
      await push('settings', userId, [localSettings])
    } else if (theirs.updatedAt > localSettings.updatedAt) {
      await repository.putSettings(theirs)
    }
  }

  return {
    pulled: movements.toLocal.length + sessions.toLocal.length,
    pushed: movements.toRemote.length + sessions.toRemote.length,
  }
}
