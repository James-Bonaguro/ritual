import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import styles from './Screen.module.css'

/*
 * A screen with a UIKit-style navigation bar.
 *
 * With `largeTitle`, the title starts big in the content and collapses to an
 * inline title as you scroll, with the bar material fading in behind it —
 * the UINavigationController behaviour. Without it, the bar is static.
 */

type ScreenProps = {
  title: string
  subtitle?: string
  largeTitle?: boolean
  leading?: ReactNode
  trailing?: ReactNode
  children: ReactNode
  scrollRef?: React.RefObject<HTMLDivElement | null>
}

export function Screen({
  title,
  subtitle,
  largeTitle = true,
  leading,
  trailing,
  children,
  scrollRef,
}: ScreenProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const innerScrollRef = useRef<HTMLDivElement>(null)
  const scroll = scrollRef ?? innerScrollRef
  const frame = useRef<number | null>(null)

  // Distance the large title travels before it is fully collapsed. Measured
  // against the rendered block so a subtitle doesn't desynchronise the fade.
  const titleBlockRef = useRef<HTMLDivElement>(null)

  const updateProgress = useCallback(() => {
    frame.current = null
    const el = scroll.current
    const root = rootRef.current
    if (!el || !root) return

    if (!largeTitle) {
      root.style.setProperty('--nav-progress', '1')
      return
    }

    const travel = Math.max(titleBlockRef.current?.offsetHeight ?? 44, 1)
    const progress = Math.min(Math.max(el.scrollTop / travel, 0), 1)
    root.style.setProperty('--nav-progress', progress.toFixed(3))
  }, [largeTitle, scroll])

  const onScroll = useCallback(() => {
    // Coalesce to one update per frame; scroll fires far more often than that.
    if (frame.current !== null) return
    frame.current = requestAnimationFrame(updateProgress)
  }, [updateProgress])

  useEffect(() => {
    updateProgress()
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
    }
  }, [updateProgress])

  return (
    <div ref={rootRef} className={`${styles.screen} ${largeTitle ? '' : styles.staticBar}`}>
      <div className={styles.navBar}>
        {leading ? <div className={`${styles.navSlot} ${styles.navSlotLeading}`}>{leading}</div> : null}
        <div className={styles.inlineTitle}>{title}</div>
        {trailing ? (
          <div className={`${styles.navSlot} ${styles.navSlotTrailing}`}>{trailing}</div>
        ) : null}
      </div>

      <div ref={scroll} className={styles.scroll} onScroll={onScroll}>
        {largeTitle ? (
          <div ref={titleBlockRef} className={styles.largeTitleBlock}>
            <h1 className={styles.largeTitle}>{title}</h1>
            {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
          </div>
        ) : null}
        {children}
      </div>
    </div>
  )
}

/* ---- Bar buttons ---------------------------------------------------------- */

type BarButtonProps = {
  children: ReactNode
  onClick?: () => void
  side?: 'leading' | 'trailing'
  prominent?: boolean
  disabled?: boolean
  label?: string
}

export function BarButton({
  children,
  onClick,
  side = 'trailing',
  prominent,
  disabled,
  label,
}: BarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      className={[
        styles.barButton,
        side === 'leading' ? styles.barButtonLeading : styles.barButtonTrailing,
        prominent ? styles.barButtonProminent : '',
        disabled ? styles.barButtonDisabled : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </button>
  )
}
