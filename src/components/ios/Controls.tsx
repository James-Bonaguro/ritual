import type { CSSProperties, ReactNode } from 'react'
import { Icon, type IconName } from './Icon'
import styles from './Controls.module.css'

/* ---- Segmented control ---------------------------------------------------- */

type SegmentedProps<T extends string> = {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  style?: CSSProperties
}

export function Segmented<T extends string>({ options, value, onChange, style }: SegmentedProps<T>) {
  const index = Math.max(
    options.findIndex((o) => o.value === value),
    0,
  )

  return (
    <div className={styles.segmented} role="tablist" style={style}>
      {/* Track is inset by 4px either side, so segments divide (100% - 8px).
          translateX(100%) then advances by exactly one segment width. */}
      <div
        className={styles.thumb}
        style={{
          width: `calc((100% - 8px) / ${options.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {options.map((option, i) => {
        // A divider sits before every segment except the first, and is hidden
        // when it touches the thumb on either side.
        const showDivider = i > 0 && i !== index && i !== index + 1
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={option.value === value}
            className={`${styles.segment} ${option.value === value ? styles.segmentActive : ''}`}
            onClick={() => onChange(option.value)}
          >
            {i > 0 ? (
              <span
                className={`${styles.divider} ${showDivider ? '' : styles.dividerHidden}`}
                style={{ left: 0 }}
                aria-hidden="true"
              />
            ) : null}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

/* ---- Button --------------------------------------------------------------- */

type ButtonProps = {
  children: ReactNode
  onClick?: () => void
  variant?: 'filled' | 'tinted' | 'gray' | 'plain'
  block?: boolean
  small?: boolean
  destructive?: boolean
  disabled?: boolean
  icon?: IconName
  style?: CSSProperties
  type?: 'button' | 'submit'
}

export function Button({
  children,
  onClick,
  variant = 'filled',
  block,
  small,
  destructive,
  disabled,
  icon,
  style,
  type = 'button',
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={style}
      className={[
        styles.button,
        styles[variant],
        block ? styles.buttonBlock : '',
        small ? styles.buttonSmall : '',
        destructive ? styles.destructiveButton : '',
        disabled ? styles.buttonDisabled : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {icon ? <Icon name={icon} size={small ? 16 : 19} strokeWidth={2.2} /> : null}
      {children}
    </button>
  )
}

/* ---- Checkbox ------------------------------------------------------------- */

type CheckboxProps = {
  checked: boolean
  onChange: (checked: boolean) => void
  tint?: string
  label?: string
}

export function Checkbox({ checked, onChange, tint, label }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      className={styles.checkboxHit}
      onClick={() => onChange(!checked)}
    >
      <span
        className={`${styles.checkbox} ${checked ? styles.checkboxChecked : ''}`}
        style={tint ? ({ '--tint': tint } as CSSProperties) : undefined}
      >
        <Icon name="checkmark" size={15} strokeWidth={2.8} />
      </span>
    </button>
  )
}

/**
 * Visual-only checkmark for use *inside* a row that is itself tappable.
 *
 * Never make this a button. A `<button>` nested in a `<button>` is invalid
 * HTML, and the inner click also bubbles to the outer handler — which fires
 * the toggle twice and silently cancels it out. That exact bug made adding a
 * movement impossible depending on where your thumb landed.
 */
export function CheckMark({ checked, tint }: { checked: boolean; tint?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`${styles.checkbox} ${checked ? styles.checkboxChecked : ''}`}
      style={tint ? ({ '--tint': tint } as CSSProperties) : undefined}
    >
      <Icon name="checkmark" size={15} strokeWidth={2.8} />
    </span>
  )
}

/* ---- Text input ----------------------------------------------------------- */

type TextFieldProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  leading?: ReactNode
  trailing?: ReactNode
  autoFocus?: boolean
  onSubmit?: () => void
  inputMode?: 'text' | 'numeric'
  ariaLabel?: string
}

export function TextField({
  value,
  onChange,
  placeholder,
  leading,
  trailing,
  autoFocus,
  onSubmit,
  inputMode,
  ariaLabel,
}: TextFieldProps) {
  return (
    <div className={styles.field}>
      {leading}
      <input
        className={styles.fieldInput}
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        inputMode={inputMode}
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onSubmit) {
            e.preventDefault()
            onSubmit()
          }
        }}
      />
      {trailing}
    </div>
  )
}

export function TextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
  ariaLabel,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  ariaLabel?: string
}) {
  return (
    <textarea
      className={styles.textarea}
      value={value}
      rows={rows}
      placeholder={placeholder}
      aria-label={ariaLabel ?? placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

export function SearchField({
  value,
  onChange,
  placeholder = 'Search',
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <div className={styles.searchField}>
      <Icon name="search" size={17} strokeWidth={2.2} />
      <input
        className={styles.searchInput}
        value={value}
        placeholder={placeholder}
        aria-label={placeholder}
        type="search"
        onChange={(e) => onChange(e.target.value)}
      />
      {value ? (
        <button type="button" onClick={() => onChange('')} aria-label="Clear search">
          <Icon name="close" size={16} strokeWidth={2.4} />
        </button>
      ) : null}
    </div>
  )
}

/* ---- Empty state ---------------------------------------------------------- */

export function EmptyState({
  glyph,
  title,
  message,
  action,
}: {
  glyph: IconName
  title: string
  message: string
  action?: ReactNode
}) {
  return (
    <div className={styles.empty}>
      <Icon name={glyph} size={52} strokeWidth={1.4} className={styles.emptyGlyph} />
      <div className={styles.emptyTitle}>{title}</div>
      <p className={styles.emptyMessage}>{message}</p>
      {action ? <div className={styles.emptyAction}>{action}</div> : null}
    </div>
  )
}
