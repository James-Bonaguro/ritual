import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Backup, Movement, Session, Settings } from './types'
import type { Repository } from './repository'

/*
 * IndexedDB-backed local store. This is the source of truth on the device and
 * stays that way even once sync exists — the gym has bad signal, and the app
 * must never be waiting on a network round trip to show you your own log.
 */

interface RitualDB extends DBSchema {
  movements: { key: string; value: Movement }
  sessions: { key: string; value: Session; indexes: { date: string } }
  settings: { key: string; value: Settings }
}

const DB_NAME = 'ritual'
const DB_VERSION = 1

// Safari has a long-standing bug where an IDBOpenDBRequest can simply never
// fire success, error, or blocked — most often on a cold launch. Memoizing
// that hung promise would wedge every read and write for the rest of the
// tab's life. On timeout the slot is cleared instead, so the next call opens
// a fresh request rather than awaiting one that already died.
const DB_OPEN_TIMEOUT_MS = 4000

let dbPromise: Promise<IDBPDatabase<RitualDB>> | null = null

function db(): Promise<IDBPDatabase<RitualDB>> {
  if (!dbPromise) {
    const opening = openDB<RitualDB>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains('movements')) {
          database.createObjectStore('movements', { keyPath: 'id' })
        }
        if (!database.objectStoreNames.contains('sessions')) {
          const store = database.createObjectStore('sessions', { keyPath: 'id' })
          store.createIndex('date', 'date')
        }
        if (!database.objectStoreNames.contains('settings')) {
          database.createObjectStore('settings', { keyPath: 'id' })
        }
      },
    })

    dbPromise = new Promise<IDBPDatabase<RitualDB>>((resolve, reject) => {
      const timer = setTimeout(() => {
        dbPromise = null
        reject(new Error('Opening the local database timed out'))
      }, DB_OPEN_TIMEOUT_MS)
      opening.then(
        (database) => {
          clearTimeout(timer)
          resolve(database)
        },
        (error: unknown) => {
          clearTimeout(timer)
          dbPromise = null
          reject(error)
        },
      )
    })
  }
  return dbPromise
}

export const localRepository: Repository = {
  async listMovements() {
    return (await db()).getAll('movements')
  },

  async putMovement(movement) {
    await (await db()).put('movements', movement)
  },

  async deleteMovement(id) {
    await (await db()).delete('movements', id)
  },

  async listSessions() {
    return (await db()).getAll('sessions')
  },

  async putSession(session) {
    await (await db()).put('sessions', session)
  },

  async deleteSession(id) {
    await (await db()).delete('sessions', id)
  },

  async getSettings() {
    return (await (await db()).get('settings', 'settings')) ?? null
  },

  async putSettings(settings) {
    await (await db()).put('settings', settings)
  },

  async replaceAll(backup: Backup) {
    const database = await db()
    const tx = database.transaction(['movements', 'sessions', 'settings'], 'readwrite')
    await Promise.all([
      tx.objectStore('movements').clear(),
      tx.objectStore('sessions').clear(),
      tx.objectStore('settings').clear(),
    ])
    await Promise.all([
      ...backup.movements.map((m) => tx.objectStore('movements').put(m)),
      ...backup.sessions.map((s) => tx.objectStore('sessions').put(s)),
      backup.settings ? tx.objectStore('settings').put(backup.settings) : Promise.resolve(),
    ])
    await tx.done
  },

  async clear() {
    const database = await db()
    const tx = database.transaction(['movements', 'sessions', 'settings'], 'readwrite')
    await Promise.all([
      tx.objectStore('movements').clear(),
      tx.objectStore('sessions').clear(),
      tx.objectStore('settings').clear(),
    ])
    await tx.done
  },
}
