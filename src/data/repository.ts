import type { Backup, Movement, Session, Settings } from './types'

/*
 * The single seam between the app and where data lives.
 *
 * Everything above this line works on in-memory arrays; everything below it is
 * swappable. Adding cloud sync means writing another implementation of this
 * interface, not touching any screen.
 */
export interface Repository {
  listMovements(): Promise<Movement[]>
  putMovement(movement: Movement): Promise<void>
  deleteMovement(id: string): Promise<void>

  listSessions(): Promise<Session[]>
  putSession(session: Session): Promise<void>
  deleteSession(id: string): Promise<void>

  getSettings(): Promise<Settings | null>
  putSettings(settings: Settings): Promise<void>

  /** Bulk replace, used by backup import. */
  replaceAll(backup: Backup): Promise<void>
  clear(): Promise<void>
}
