import type { CSSProperties, ReactNode } from 'react'
import { Icon } from './Icon'
import styles from './List.module.css'

type ListSectionProps = {
  header?: ReactNode
  footer?: ReactNode
  children: ReactNode
  /**
   * Left offset of the row separators. Pass a larger value when rows carry
   * leading icons so the hairline starts at the text, not the icon.
   */
  separatorInset?: number
  plain?: boolean
  tight?: boolean
  style?: CSSProperties
}

export function ListSection({
  header,
  footer,
  children,
  separatorInset,
  plain,
  tight,
  style,
}: ListSectionProps) {
  const groupStyle =
    separatorInset === undefined
      ? undefined
      : ({ '--separator-inset': `${separatorInset}px` } as CSSProperties)

  return (
    <section className={`${styles.section} ${tight ? styles.sectionTight : ''}`} style={style}>
      {header ? <div className={styles.header}>{header}</div> : null}
      <div className={`${styles.group} ${plain ? styles.groupPlain : ''}`} style={groupStyle}>
        {children}
      </div>
      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </section>
  )
}

type ListRowProps = {
  title?: ReactNode
  subtitle?: ReactNode
  value?: ReactNode
  leading?: ReactNode
  trailing?: ReactNode
  onClick?: () => void
  chevron?: boolean
  destructive?: boolean
  centered?: boolean
  wrapTitle?: boolean
  children?: ReactNode
  style?: CSSProperties
}

export function ListRow({
  title,
  subtitle,
  value,
  leading,
  trailing,
  onClick,
  chevron,
  destructive,
  centered,
  wrapTitle,
  children,
  style,
}: ListRowProps) {
  const className = [
    styles.row,
    onClick ? styles.rowTappable : '',
    destructive ? styles.destructive : '',
    centered ? styles.centered : '',
  ]
    .filter(Boolean)
    .join(' ')

  const content = (
    <>
      {leading ? <div className={styles.rowLeading}>{leading}</div> : null}
      {children ?? (
        <div className={styles.rowBody}>
          {title !== undefined ? (
            <div className={`${styles.rowTitle} ${wrapTitle ? styles.rowTitleWrap : ''}`}>{title}</div>
          ) : null}
          {subtitle !== undefined ? <div className={styles.rowSubtitle}>{subtitle}</div> : null}
        </div>
      )}
      {value !== undefined ? <div className={styles.rowValue}>{value}</div> : null}
      {trailing || chevron ? (
        <div className={styles.rowTrailing}>
          {trailing}
          {chevron ? <Icon name="chevron-right" size={15} strokeWidth={2.4} className={styles.chevron} /> : null}
        </div>
      ) : null}
    </>
  )

  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick} style={style}>
        {content}
      </button>
    )
  }

  return (
    <div className={className} style={style}>
      {content}
    </div>
  )
}

/** Rounded-square glyph tile, as used down the left edge of Settings.app. */
export function RowIcon({ name, tint }: { name: Parameters<typeof Icon>[0]['name']; tint: string }) {
  return (
    <div className={styles.rowIconTile} style={{ background: tint }}>
      <Icon name={name} size={18} strokeWidth={2} />
    </div>
  )
}
