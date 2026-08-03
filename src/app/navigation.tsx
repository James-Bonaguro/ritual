import { useCallback, useEffect, useRef, useState } from 'react'
import type { TabKey } from '../components/ios/AppShell'

/*
 * Navigation is held in memory, not in the URL.
 *
 * Native apps don't have addressable screens, and a tab bar plus a per-tab
 * push stack is exactly what UIKit gives you. It also means GitHub Pages never
 * has to serve a deep link it doesn't have a file for.
 */

export type Route =
  | { name: 'today' }
  | { name: 'movements' }
  | { name: 'history' }
  | { name: 'movementDetail'; movementId: string }
  | { name: 'sessionDetail'; sessionId: string }
  | { name: 'settings' }
  | { name: 'visitTemplate' }

const ROOTS: Record<TabKey, Route> = {
  today: { name: 'today' },
  movements: { name: 'movements' },
  history: { name: 'history' },
}

export type Navigator = {
  tab: TabKey
  stack: Route[]
  setTab: (tab: TabKey) => void
  push: (route: Route) => void
  pop: () => void
}

export function useNavigator(): Navigator {
  const [tab, setTabState] = useState<TabKey>('today')
  const [stacks, setStacks] = useState<Record<TabKey, Route[]>>({
    today: [ROOTS.today],
    movements: [ROOTS.movements],
    history: [ROOTS.history],
  })

  // Tracks how many entries we pushed onto history, so a popstate can be told
  // apart from the user navigating away from the app entirely.
  const depth = useRef(0)

  const push = useCallback(
    (route: Route) => {
      setStacks((current) => ({ ...current, [tab]: [...current[tab], route] }))
      depth.current += 1
      window.history.pushState({ ritualDepth: depth.current }, '')
    },
    [tab],
  )

  const pop = useCallback(() => {
    setStacks((current) => {
      const stack = current[tab]
      if (stack.length <= 1) return current
      return { ...current, [tab]: stack.slice(0, -1) }
    })
  }, [tab])

  const setTab = useCallback(
    (next: TabKey) => {
      // Tapping the tab you're already on pops that tab to its root, the way
      // every Apple tab bar behaves.
      if (next === tab) {
        setStacks((current) => ({ ...current, [next]: [ROOTS[next]] }))
        return
      }
      setTabState(next)
    },
    [tab],
  )

  // Wire the browser/system back gesture to popping the stack.
  useEffect(() => {
    const onPopState = () => {
      depth.current = Math.max(0, depth.current - 1)
      setStacks((current) => {
        const stack = current[tab]
        if (stack.length <= 1) return current
        return { ...current, [tab]: stack.slice(0, -1) }
      })
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [tab])

  return { tab, stack: stacks[tab], setTab, push, pop }
}
