import type { ReactNode } from 'react'
import { Icon, type IconName } from './Icon'
import styles from './AppShell.module.css'

export type TabKey = 'today' | 'movements' | 'history'

const TABS: { key: TabKey; label: string; icon: IconName; iconActive: IconName }[] = [
  { key: 'today', label: 'Today', icon: 'today', iconActive: 'today-fill' },
  { key: 'movements', label: 'Movements', icon: 'movements', iconActive: 'movements-fill' },
  { key: 'history', label: 'History', icon: 'history', iconActive: 'history-fill' },
]

export function AppShell({
  tab,
  onTabChange,
  children,
}: {
  tab: TabKey
  onTabChange: (tab: TabKey) => void
  children: ReactNode
}) {
  return (
    <div className={styles.shell}>
      <div className={styles.content}>{children}</div>
      <nav className={styles.nav} aria-label="Main">
        <div className={styles.navBrand}>Ritual</div>
        {TABS.map((t) => {
          const active = t.key === tab
          return (
            <button
              key={t.key}
              type="button"
              aria-current={active ? 'page' : undefined}
              className={`${styles.tab} ${active ? styles.tabActive : ''}`}
              onClick={() => onTabChange(t.key)}
            >
              <Icon name={active ? t.iconActive : t.icon} size={active ? 25 : 24} strokeWidth={1.9} />
              <span className={styles.tabLabel}>{t.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
