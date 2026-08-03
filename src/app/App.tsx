import { useCallback, type ReactNode } from 'react'
import { AppShell } from '../components/ios/AppShell'
import { useStore } from '../data/store'
import { NavStack } from './NavStack'
import { useNavigator, type Route } from './navigation'
import { TodayScreen } from '../features/today/TodayScreen'
import { SessionScreen } from '../features/session/SessionScreen'
import { MovementsScreen } from '../features/movements/MovementsScreen'
import { MovementDetail } from '../features/movements/MovementDetail'
import { HistoryScreen } from '../features/history/HistoryScreen'
import { SettingsScreen, VisitTemplateScreen } from '../features/settings/SettingsScreen'

export function App() {
  const { ready } = useStore()
  const nav = useNavigator()

  const renderRoute = useCallback(
    (route: Route): ReactNode => {
      switch (route.name) {
        case 'today':
          return (
            <TodayScreen
              onOpenSession={(id) => nav.push({ name: 'sessionDetail', sessionId: id })}
              onOpenMovement={(id) => nav.push({ name: 'movementDetail', movementId: id })}
              onOpenSettings={() => nav.push({ name: 'settings' })}
              onSeeAllMovements={() => nav.setTab('movements')}
            />
          )
        case 'movements':
          return (
            <MovementsScreen
              onOpenMovement={(id) => nav.push({ name: 'movementDetail', movementId: id })}
            />
          )
        case 'history':
          return (
            <HistoryScreen
              onOpenSession={(id) => nav.push({ name: 'sessionDetail', sessionId: id })}
            />
          )
        case 'sessionDetail':
          return <SessionScreen sessionId={route.sessionId} onBack={nav.pop} />
        case 'movementDetail':
          return (
            <MovementDetail
              movementId={route.movementId}
              onBack={nav.pop}
              onOpenSession={(id) => nav.push({ name: 'sessionDetail', sessionId: id })}
            />
          )
        case 'settings':
          return (
            <SettingsScreen
              onBack={nav.pop}
              onOpenVisitTemplate={() => nav.push({ name: 'visitTemplate' })}
            />
          )
        case 'visitTemplate':
          return <VisitTemplateScreen onBack={nav.pop} />
      }
    },
    [nav],
  )

  // Nothing renders until IndexedDB has answered. It resolves in a few
  // milliseconds, and a blank frame is better than a flash of "no sessions
  // yet" for someone who has hundreds.
  if (!ready) return null

  return (
    <AppShell tab={nav.tab} onTabChange={nav.setTab}>
      <NavStack stack={nav.stack} render={renderRoute} />
    </AppShell>
  )
}
