import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Route } from './navigation'
import styles from './NavStack.module.css'

/*
 * Renders a push stack with the iOS transition: the incoming screen slides in
 * from the trailing edge while the one below it parallaxes a quarter of the
 * way out and dims.
 *
 * A popped screen has to stay mounted for the length of its exit animation,
 * which is what `exiting` tracks.
 */

const EXIT_MS = 280

export function NavStack({
  stack,
  render,
}: {
  stack: Route[]
  render: (route: Route, index: number) => ReactNode
}) {
  const [exiting, setExiting] = useState<{ route: Route; index: number } | null>(null)
  const previous = useRef<Route[]>(stack)
  // Layers mount at translateX(100%) and are released to 0 one frame later,
  // giving the browser a from-state to animate out of.
  const [entering, setEntering] = useState<number | null>(null)

  useEffect(() => {
    const before = previous.current
    previous.current = stack

    if (stack.length > before.length) {
      setEntering(stack.length - 1)
      const id = requestAnimationFrame(() => setEntering(null))
      return () => cancelAnimationFrame(id)
    }

    if (stack.length < before.length) {
      const popped = before[before.length - 1]
      setExiting({ route: popped, index: before.length - 1 })
      const timer = setTimeout(() => setExiting(null), EXIT_MS)
      return () => clearTimeout(timer)
    }
  }, [stack])

  const topIndex = stack.length - 1

  return (
    <div className={styles.host}>
      {stack.map((route, index) => {
        const isTop = index === topIndex
        // While something is exiting, the screen it uncovers must not also be
        // pushed aside — it is the destination, not a layer below.
        const isBelow = index < topIndex
        return (
          <div
            key={`${route.name}-${index}`}
            className={[
              styles.layer,
              index === 0 ? styles.layerRoot : '',
              isBelow ? styles.layerBelow : styles.layerTop,
              isTop && entering === index ? styles.layerEntering : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-hidden={isBelow ? true : undefined}
          >
            {render(route, index)}
          </div>
        )
      })}

      {exiting ? (
        <div
          key="exiting"
          className={`${styles.layer} ${styles.layerTop} ${styles.layerExiting}`}
          aria-hidden="true"
        >
          {render(exiting.route, exiting.index)}
        </div>
      ) : null}
    </div>
  )
}
