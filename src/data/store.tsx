import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Appearance, Backup, Movement, Session, Settings } from './types'
import { localRepository } from './localAdapter'
import type { Repository } from './repository'
import { DEFAULT_VISIT_TEMPLATE } from '../domain/flow'
import { movementsToSeed, SEED_VERSION } from '../domain/library'
import { createMovement, sortSessions } from '../domain/sessions'

/*
 * The whole database is held in memory.
 *
 * That is a deliberate call, not laziness: a decade of daily gym visits is a
 * few thousand small records. Keeping it all resident means staleness can be
 * recomputed synchronously on every render and no screen ever shows a spinner.
 */

const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  appearance: 'system',
  visitTemplate: DEFAULT_VISIT_TEMPLATE,
  updatedAt: new Date(0).toISOString(),
}

type StoreValue = {
  ready: boolean
  movements: Movement[]
  sessions: Session[]
  settings: Settings
  movementsById: Map<string, Movement>

  saveSession: (session: Session) => Promise<void>
  deleteSession: (id: string) => Promise<void>
  saveMovement: (movement: Movement) => Promise<void>
  deleteMovement: (id: string) => Promise<void>
  saveSettings: (settings: Settings) => Promise<void>

  /** Finds an existing movement by name, or creates one. Case-insensitive. */
  ensureMovement: (name: string, areas?: Movement['areas']) => Promise<Movement>

  exportBackup: () => Backup
  importBackup: (backup: Backup) => Promise<void>
  clearAll: () => Promise<void>
}

const StoreContext = createContext<StoreValue | null>(null)

/**
 * Tops up the starter library, persisting anything it adds.
 *
 * Only inserts names that aren't already present, so nothing the user created
 * is disturbed and a second run is a no-op. Guarded by seedVersion so a
 * movement deleted on purpose doesn't reappear on the next launch.
 */
async function seedLibrary(
  repository: Repository,
  existing: Movement[],
  settings: Settings,
): Promise<{ movements: Movement[]; settings: Settings }> {
  if ((settings.seedVersion ?? 0) >= SEED_VERSION) return { movements: existing, settings }

  const additions = movementsToSeed(existing).map((seed) =>
    createMovement({
      name: seed.name,
      splits: seed.splits,
      areas: seed.areas,
      order: seed.order,
    }),
  )

  if (additions.length > 0) {
    await Promise.all(additions.map((m) => repository.putMovement(m)))
  }

  const stamped = { ...settings, seedVersion: SEED_VERSION }
  await repository.putSettings(stamped)

  return { movements: [...existing, ...additions], settings: stamped }
}

export function StoreProvider({
  children,
  repository = localRepository,
}: {
  children: ReactNode
  repository?: Repository
}) {
  const [ready, setReady] = useState(false)
  const [movements, setMovements] = useState<Movement[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [loadedMovements, loadedSessions, loadedSettings] = await Promise.all([
          repository.listMovements(),
          repository.listSessions(),
          repository.getSettings(),
        ])
        if (cancelled) return

        const settingsNow = loadedSettings
          ? { ...DEFAULT_SETTINGS, ...loadedSettings }
          : DEFAULT_SETTINGS

        // Seeding gets its own guard. Folded into the outer try, a failed write
        // — a storage quota, a blocked upgrade — would skip the setters below
        // and render a user with years of history an empty app, every launch.
        let movementsNow = loadedMovements
        let settingsFinal = settingsNow
        try {
          const result = await seedLibrary(repository, loadedMovements, settingsNow)
          movementsNow = result.movements
          settingsFinal = result.settings
        } catch (error) {
          console.error('Could not seed the starter library', error)
        }

        if (cancelled) return
        setSettings(settingsFinal)
        setMovements(movementsNow)
        setSessions(sortSessions(loadedSessions))
      } catch (error) {
        // Private browsing and some locked-down configurations block
        // IndexedDB. The app still works for the session; it just won't
        // persist, which is better than a blank screen.
        console.error('Could not open local database', error)
      } finally {
        if (!cancelled) setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [repository])

  const saveSession = useCallback(
    async (session: Session) => {
      setSessions((current) => {
        const next = current.some((s) => s.id === session.id)
          ? current.map((s) => (s.id === session.id ? session : s))
          : [...current, session]
        return sortSessions(next)
      })
      await repository.putSession(session)
    },
    [repository],
  )

  const deleteSession = useCallback(
    async (id: string) => {
      setSessions((current) => current.filter((s) => s.id !== id))
      await repository.deleteSession(id)
    },
    [repository],
  )

  const saveMovement = useCallback(
    async (movement: Movement) => {
      setMovements((current) =>
        current.some((m) => m.id === movement.id)
          ? current.map((m) => (m.id === movement.id ? movement : m))
          : [...current, movement],
      )
      await repository.putMovement(movement)
    },
    [repository],
  )

  const deleteMovement = useCallback(
    async (id: string) => {
      setMovements((current) => current.filter((m) => m.id !== id))
      await repository.deleteMovement(id)
    },
    [repository],
  )

  const saveSettings = useCallback(
    async (next: Settings) => {
      const stamped = { ...next, updatedAt: new Date().toISOString() }
      setSettings(stamped)
      await repository.putSettings(stamped)
    },
    [repository],
  )

  const ensureMovement = useCallback<StoreValue['ensureMovement']>(
    async (name, areas) => {
      const trimmed = name.trim()
      const existing = movements.find((m) => m.name.toLowerCase() === trimmed.toLowerCase())
      if (existing) return existing

      const created = createMovement({ name: trimmed, areas })
      await saveMovement(created)
      return created
    },
    [movements, saveMovement],
  )

  const exportBackup = useCallback<StoreValue['exportBackup']>(
    () => ({
      version: 1,
      exportedAt: new Date().toISOString(),
      movements,
      sessions,
      settings,
    }),
    [movements, sessions, settings],
  )

  const importBackup = useCallback<StoreValue['importBackup']>(
    async (backup) => {
      await repository.replaceAll(backup)
      setMovements(backup.movements)
      setSessions(sortSessions(backup.sessions))
      setSettings(backup.settings ? { ...DEFAULT_SETTINGS, ...backup.settings } : DEFAULT_SETTINGS)
    },
    [repository],
  )

  const clearAll = useCallback(async () => {
    await repository.clear()
    setSessions([])

    // Re-seed rather than leaving a bare library. Seeding otherwise only runs
    // on mount, so erasing would strand the user with nothing to pick until
    // they happened to reload the page.
    try {
      const seeded = await seedLibrary(repository, [], DEFAULT_SETTINGS)
      setMovements(seeded.movements)
      setSettings(seeded.settings)
    } catch (error) {
      console.error('Could not re-seed after erasing', error)
      setMovements([])
      setSettings(DEFAULT_SETTINGS)
    }
  }, [repository])

  const movementsById = useMemo(() => new Map(movements.map((m) => [m.id, m])), [movements])

  // Appearance is applied to the root element; tokens.css keys off the
  // data-scheme attribute, with 'system' meaning "no attribute, follow media".
  useEffect(() => {
    applyAppearance(settings.appearance)
  }, [settings.appearance])

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      movements,
      sessions,
      settings,
      movementsById,
      saveSession,
      deleteSession,
      saveMovement,
      deleteMovement,
      saveSettings,
      ensureMovement,
      exportBackup,
      importBackup,
      clearAll,
    }),
    [
      ready,
      movements,
      sessions,
      settings,
      movementsById,
      saveSession,
      deleteSession,
      saveMovement,
      deleteMovement,
      saveSettings,
      ensureMovement,
      exportBackup,
      importBackup,
      clearAll,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function applyAppearance(appearance: Appearance) {
  const root = document.documentElement
  if (appearance === 'system') root.removeAttribute('data-scheme')
  else root.setAttribute('data-scheme', appearance)
}

export function useStore(): StoreValue {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore must be used inside a StoreProvider')
  return store
}
