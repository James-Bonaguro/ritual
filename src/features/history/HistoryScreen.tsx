import { useMemo, useState } from 'react'
import { useStore } from '../../data/store'
import { formatMonthYear, formatRelativeDay } from '../../domain/dates'
import { sessionTitle, summarise } from '../../domain/sessions'
import { Screen } from '../../components/ios/Screen'
import { EmptyState, SearchField } from '../../components/ios/Controls'
import { ListRow, ListSection } from '../../components/ios/List'
import { SplitBadge } from '../shared/Badges'

/*
 * The journal. Grouped by month and searchable across every note written at
 * any level — session intent, session notes, and per-movement notes — because
 * "what did I write when my shoulder was bad" is a real question.
 */

export function HistoryScreen({ onOpenSession }: { onOpenSession: (id: string) => void }) {
  const { sessions, movementsById } = useStore()
  const [query, setQuery] = useState('')

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sessions

    return sessions.filter((session) => {
      if (session.intent?.toLowerCase().includes(q)) return true
      if (session.notes?.toLowerCase().includes(q)) return true
      if (sessionTitle(session).toLowerCase().includes(q)) return true
      return session.movements.some(
        (m) =>
          m.note?.toLowerCase().includes(q) ||
          movementsById.get(m.movementId)?.name.toLowerCase().includes(q),
      )
    })
  }, [sessions, query, movementsById])

  // Sessions arrive newest-first, so insertion order preserves that per month.
  const byMonth = useMemo(() => {
    const groups = new Map<string, typeof matches>()
    for (const session of matches) {
      const key = session.date.slice(0, 7)
      const bucket = groups.get(key)
      if (bucket) bucket.push(session)
      else groups.set(key, [session])
    }
    return [...groups.entries()]
  }, [matches])

  if (sessions.length === 0) {
    return (
      <Screen title="History">
        <EmptyState
          glyph="history"
          title="No sessions yet"
          message="Every visit you log lands here, newest first, with everything you wrote about it."
        />
      </Screen>
    )
  }

  return (
    <Screen title="History" subtitle={`${sessions.length} ${sessions.length === 1 ? 'session' : 'sessions'}`}>
      <SearchField value={query} onChange={setQuery} placeholder="Search notes and movements" />

      {byMonth.length === 0 ? (
        <EmptyState glyph="search" title="No matches" message={`Nothing logged mentions “${query}”.`} />
      ) : null}

      {byMonth.map(([month, group]) => (
        <ListSection key={month} header={formatMonthYear(`${month}-01`)}>
          {group.map((session) => (
            <ListRow
              key={session.id}
              title={sessionTitle(session)}
              subtitle={summarise(session, movementsById)}
              value={formatRelativeDay(session.date)}
              trailing={session.status === 'planned' ? <SplitBadge split={session.splitType} /> : undefined}
              onClick={() => onOpenSession(session.id)}
              chevron
            />
          ))}
        </ListSection>
      ))}
    </Screen>
  )
}
