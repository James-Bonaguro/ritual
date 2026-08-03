import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import styles from './Sheet.module.css'

/*
 * Modally presented sheet with the iOS card behaviour: slides up over a dimmed
 * backdrop, shows a grabber, and can be dragged down to dismiss.
 *
 * Drag is deliberately limited to the header rather than the whole sheet —
 * dragging anywhere would fight with scrolling the body content, which is the
 * usual way web sheet implementations feel wrong.
 */

type SheetProps = {
  open: boolean
  onClose: () => void
  title?: string
  leadingAction?: { label: string; onClick: () => void }
  trailingAction?: { label: string; onClick: () => void; disabled?: boolean }
  children: ReactNode
}

const DISMISS_DISTANCE = 120
const DISMISS_VELOCITY = 0.5 // px per ms

export function Sheet({ open, onClose, title, leadingAction, trailingAction, children }: SheetProps) {
  // `mounted` keeps the sheet in the tree for the duration of the exit
  // animation; `entered` drives the open transform one frame after mount so
  // the browser has a from-state to animate out of.
  const [mounted, setMounted] = useState(open)
  const [entered, setEntered] = useState(false)
  const [dragY, setDragY] = useState<number | null>(null)

  const sheetRef = useRef<HTMLDivElement>(null)
  const dragStart = useRef<{ y: number; t: number } | null>(null)

  useEffect(() => {
    if (open) {
      setMounted(true)
      const id = requestAnimationFrame(() => setEntered(true))
      return () => cancelAnimationFrame(id)
    }
    setEntered(false)
    const timer = setTimeout(() => setMounted(false), 420)
    return () => clearTimeout(timer)
  }, [open])

  // Escape closes, matching what a keyboard user on the Mac expects.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Lock the page behind the sheet so it can't scroll under the presentation.
  useEffect(() => {
    if (!mounted) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [mounted])

  if (!mounted) return null

  const onPointerDown = (e: React.PointerEvent) => {
    dragStart.current = { y: e.clientY, t: performance.now() }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragStart.current) return
    // Rubber-band upward drags to zero: the sheet is already at its detent.
    setDragY(Math.max(0, e.clientY - dragStart.current.y))
  }

  const onPointerUp = (e: React.PointerEvent) => {
    const start = dragStart.current
    dragStart.current = null
    if (!start) return
    e.currentTarget.releasePointerCapture(e.pointerId)

    const distance = e.clientY - start.y
    const velocity = distance / Math.max(performance.now() - start.t, 1)
    setDragY(null)

    // A quick flick dismisses even if it didn't travel far, which is what
    // makes the gesture feel responsive rather than strict.
    if (distance > DISMISS_DISTANCE || velocity > DISMISS_VELOCITY) onClose()
  }

  const dragging = dragY !== null

  /*
   * Portalled to the body rather than rendered in place.
   *
   * The nav stack's layers use `transform` for the push animation, and a
   * transformed ancestor both traps `position: fixed` and scopes z-index to
   * its own stacking context — so a sheet rendered inline ends up confined to
   * the content column and painting *under* the tab bar.
   */
  return createPortal(
    <>
      <div
        className={`${styles.backdrop} ${entered ? styles.backdropOpen : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div className={styles.container} role="dialog" aria-modal="true" aria-label={title}>
        <div
          ref={sheetRef}
          className={[styles.sheet, entered ? styles.sheetOpen : '', dragging ? styles.sheetDragging : '']
            .filter(Boolean)
            .join(' ')}
          style={dragging ? { transform: `translateY(${dragY}px)` } : undefined}
        >
          <div className={styles.grabber} />
          <div
            className={styles.header}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {leadingAction ? (
              <button
                type="button"
                className={`${styles.action} ${styles.actionLeading}`}
                onClick={leadingAction.onClick}
              >
                {leadingAction.label}
              </button>
            ) : null}
            {title ? <div className={styles.title}>{title}</div> : null}
            {trailingAction ? (
              <button
                type="button"
                className={[
                  styles.action,
                  styles.actionTrailing,
                  trailingAction.disabled ? styles.actionDisabled : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={trailingAction.onClick}
                disabled={trailingAction.disabled}
              >
                {trailingAction.label}
              </button>
            ) : null}
          </div>
          <div className={styles.body}>{children}</div>
        </div>
      </div>
    </>,
    document.body,
  )
}
