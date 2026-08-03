import type { CSSProperties } from 'react'

/*
 * Icons drawn in the SF Symbols visual language — 24pt optical box, rounded
 * caps and joins, consistent 1.9 stroke weight.
 *
 * These are originals, not SF Symbols. Apple licenses SF Symbols for use in
 * UI running on Apple platforms and does not permit redistributing them as
 * web assets, so shipping the real glyphs here would not be legal.
 */

export type IconName =
  | 'today'
  | 'today-fill'
  | 'movements'
  | 'movements-fill'
  | 'history'
  | 'history-fill'
  | 'gear'
  | 'gear-fill'
  | 'chevron-right'
  | 'chevron-left'
  | 'chevron-down'
  | 'plus'
  | 'plus-circle'
  | 'checkmark'
  | 'close'
  | 'search'
  | 'trash'
  | 'pencil'
  | 'clock'
  | 'ellipsis'
  // Flow-step glyphs
  | 'massage-bed'
  | 'vibration-plate'
  | 'stretch'
  | 'lift'
  | 'hot-tub'
  | 'steam-room'
  | 'sauna'
  | 'cold-pool'
  | 'cold-shower'
  | 'cardio'
  | 'custom'

const paths: Record<IconName, { d: string; fill?: boolean }[]> = {
  today: [{ d: 'M3.6 10.4 12 3.8l8.4 6.6v8.3a1.9 1.9 0 0 1-1.9 1.9h-13a1.9 1.9 0 0 1-1.9-1.9z' }],
  'today-fill': [
    { d: 'M3.6 10.4 12 3.8l8.4 6.6v8.3a1.9 1.9 0 0 1-1.9 1.9h-13a1.9 1.9 0 0 1-1.9-1.9z', fill: true },
  ],

  movements: [
    { d: 'M9 6.5h11M9 12h11M9 17.5h11' },
    { d: 'M4.2 6.5h.01M4.2 12h.01M4.2 17.5h.01' },
  ],
  'movements-fill': [
    { d: 'M9 6.5h11M9 12h11M9 17.5h11' },
    { d: 'M4.2 5.3a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4M4.2 10.8a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4M4.2 16.3a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4', fill: true },
  ],

  history: [
    { d: 'M4 8.2a2.2 2.2 0 0 1 2.2-2.2h11.6A2.2 2.2 0 0 1 20 8.2v9.6a2.2 2.2 0 0 1-2.2 2.2H6.2A2.2 2.2 0 0 1 4 17.8z' },
    { d: 'M4 10.2h16M8.2 3.8v3.4M15.8 3.8v3.4' },
  ],
  'history-fill': [
    { d: 'M4 10.2h16v7.6a2.2 2.2 0 0 1-2.2 2.2H6.2A2.2 2.2 0 0 1 4 17.8z', fill: true },
    { d: 'M4 8.2a2.2 2.2 0 0 1 2.2-2.2h11.6A2.2 2.2 0 0 1 20 8.2v9.6a2.2 2.2 0 0 1-2.2 2.2H6.2A2.2 2.2 0 0 1 4 17.8z' },
    { d: 'M4 10.2h16M8.2 3.8v3.4M15.8 3.8v3.4' },
  ],

  gear: [
    { d: 'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4' },
    {
      d: 'M19.5 12a7.6 7.6 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7.5 7.5 0 0 0-2-1.2L14.7 3h-4l-.4 2.7a7.5 7.5 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5a7.6 7.6 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1a7.5 7.5 0 0 0 2 1.2l.4 2.7h4l.4-2.7a7.5 7.5 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.06-.4.1-.8.1-1.2Z',
    },
  ],
  'gear-fill': [
    {
      d: 'M19.5 12a7.6 7.6 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7.5 7.5 0 0 0-2-1.2L14.7 3h-4l-.4 2.7a7.5 7.5 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5a7.6 7.6 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1a7.5 7.5 0 0 0 2 1.2l.4 2.7h4l.4-2.7a7.5 7.5 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.06-.4.1-.8.1-1.2Z',
      fill: true,
    },
  ],

  'chevron-right': [{ d: 'm9.2 4.8 7.2 7.2-7.2 7.2' }],
  'chevron-left': [{ d: 'M14.8 4.8 7.6 12l7.2 7.2' }],
  'chevron-down': [{ d: 'm4.8 9.2 7.2 7.2 7.2-7.2' }],

  plus: [{ d: 'M12 4.6v14.8M4.6 12h14.8' }],
  'plus-circle': [{ d: 'M12 3.4a8.6 8.6 0 1 1 0 17.2 8.6 8.6 0 0 1 0-17.2' }, { d: 'M12 8.2v7.6M8.2 12h7.6' }],

  checkmark: [{ d: 'm4.8 12.6 4.8 4.8L19.2 6.6' }],
  close: [{ d: 'M5.6 5.6 18.4 18.4M18.4 5.6 5.6 18.4' }],
  search: [{ d: 'M10.8 3.8a7 7 0 1 1 0 14 7 7 0 0 1 0-14' }, { d: 'm15.9 15.9 4.3 4.3' }],

  trash: [
    { d: 'M4.6 6.6h14.8' },
    { d: 'M9.2 6.6V4.8a1.2 1.2 0 0 1 1.2-1.2h3.2a1.2 1.2 0 0 1 1.2 1.2v1.8' },
    { d: 'M6.4 6.6 7.3 19a1.4 1.4 0 0 0 1.4 1.3h6.6a1.4 1.4 0 0 0 1.4-1.3l.9-12.4' },
  ],
  pencil: [
    { d: 'M16.1 3.9a1.9 1.9 0 0 1 2.7 0l1.3 1.3a1.9 1.9 0 0 1 0 2.7L8.6 19.4l-4.8 1.1 1.1-4.8z' },
  ],
  clock: [{ d: 'M12 3.4a8.6 8.6 0 1 1 0 17.2 8.6 8.6 0 0 1 0-17.2' }, { d: 'M12 6.9V12l3.4 2.1' }],
  ellipsis: [{ d: 'M6 12h.01M12 12h.01M18 12h.01' }],

  /* --- Flow steps ------------------------------------------------------- */

  // Massage bed: a table with a headrest and a body outline resting on it.
  'massage-bed': [
    { d: 'M3.2 13.4h17.6a1 1 0 0 1 1 1v1.4a1 1 0 0 1-1 1H3.2a1 1 0 0 1-1-1v-1.4a1 1 0 0 1 1-1' },
    { d: 'M5 16.8v3.4M19 16.8v3.4' },
    { d: 'M7.4 13.4a2.3 2.3 0 0 1 2.3-2.3h7.6a2.3 2.3 0 0 1 2.3 2.3' },
    { d: 'M5.6 8.2a1.7 1.7 0 1 1 0 3.4 1.7 1.7 0 0 1 0-3.4' },
  ],

  // Vibration plate: a platform radiating oscillation lines.
  'vibration-plate': [
    { d: 'M4.6 16.4h14.8a1.1 1.1 0 0 1 1.1 1.1v1.2a1.1 1.1 0 0 1-1.1 1.1H4.6a1.1 1.1 0 0 1-1.1-1.1v-1.2a1.1 1.1 0 0 1 1.1-1.1' },
    { d: 'M8.4 12.6v-8M12 13.4V6.2M15.6 12.6v-8' },
    { d: 'M4.4 13.6a5 5 0 0 1 0-4M19.6 13.6a5 5 0 0 0 0-4' },
  ],

  // Stretch: a figure reaching over, the classic side-bend silhouette.
  stretch: [
    { d: 'M13.4 3.6a1.7 1.7 0 1 1 0 3.4 1.7 1.7 0 0 1 0-3.4' },
    { d: 'M13.6 7.8 10 12.4l3.4 2.6-1.2 5.6' },
    { d: 'm10 12.4-4.4-1.2M13.4 15 18 13' },
  ],

  // Lift: a dumbbell.
  lift: [
    { d: 'M3.2 9.6v4.8M6.2 7.4v9.2M17.8 7.4v9.2M20.8 9.6v4.8' },
    { d: 'M6.2 12h11.6' },
  ],

  // Hot tub: water line with rising heat.
  'hot-tub': [
    { d: 'M3.4 13.6h17.2v3.2a3.2 3.2 0 0 1-3.2 3.2H6.6a3.2 3.2 0 0 1-3.2-3.2z' },
    { d: 'M8 10.6c0-1.6 1.6-1.9 1.6-3.4S8 4.4 8 4.4M13 10.6c0-1.6 1.6-1.9 1.6-3.4S13 4.4 13 4.4' },
  ],

  // Steam room: dense rolling steam.
  'steam-room': [
    { d: 'M3.6 8.2h11.2a2.4 2.4 0 1 0-2.3-3' },
    { d: 'M3.6 12.4h13.6a2.4 2.4 0 1 1-2.3 3' },
    { d: 'M3.6 16.6h9.2' },
  ],

  // Sauna: radiating heat over stones.
  sauna: [
    { d: 'M5.4 15.6a4.6 4.6 0 0 1 4.6-4.6h4a4.6 4.6 0 0 1 4.6 4.6v.4a1.4 1.4 0 0 1-1.4 1.4H6.8a1.4 1.4 0 0 1-1.4-1.4z' },
    { d: 'M9 7.8c0-1.4 1.4-1.7 1.4-3S9 2.6 9 2.6M14.4 7.8c0-1.4 1.4-1.7 1.4-3s-1.4-2.2-1.4-2.2' },
    { d: 'M3.4 20.2h17.2' },
  ],

  // Cold pool: a snowflake half-submerged in water.
  'cold-pool': [
    { d: 'M12 2.8v10.4M7.6 5.4 12 8M16.4 5.4 12 8M7.6 10.6 12 8M16.4 10.6 12 8' },
    { d: 'M2.8 17.2c1.6 0 1.6 1.4 3.2 1.4s1.6-1.4 3.2-1.4 1.6 1.4 3.2 1.4 1.6-1.4 3.2-1.4 1.6 1.4 3.2 1.4 1.6-1.4 2.4-1.4' },
  ],

  // Cold shower: showerhead with falling water.
  'cold-shower': [
    { d: 'M12 3.2v3.4' },
    { d: 'M5.8 10.4a6.2 6.2 0 0 1 12.4 0z' },
    { d: 'M8.6 14v2.2M12 14.6v2.8M15.4 14v2.2M10.3 18.8v1.6M13.7 18.8v1.6' },
  ],

  // Cardio: heart with a pulse trace.
  cardio: [
    {
      d: 'M12 20.2s-7.8-4.6-7.8-10a4.4 4.4 0 0 1 7.8-2.8 4.4 4.4 0 0 1 7.8 2.8c0 5.4-7.8 10-7.8 10',
    },
  ],

  custom: [{ d: 'M12 3.4a8.6 8.6 0 1 1 0 17.2 8.6 8.6 0 0 1 0-17.2' }, { d: 'M12 8.4v7.2M8.4 12h7.2' }],
}

type IconProps = {
  name: IconName
  size?: number
  color?: string
  strokeWidth?: number
  className?: string
  style?: CSSProperties
}

export function Icon({ name, size = 24, color, strokeWidth = 1.9, className, style }: IconProps) {
  const shapes = paths[name]
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{ color, ...style }}
    >
      {shapes.map((shape, i) => (
        <path
          key={i}
          d={shape.d}
          fill={shape.fill ? 'currentColor' : 'none'}
          stroke={shape.fill ? 'none' : 'currentColor'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  )
}
