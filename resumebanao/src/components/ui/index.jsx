import { useEffect, useId, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, LoaderCircle, X } from 'lucide-react'
import { cx } from '../../lib/cx'
import { EASE_OUT } from '../../lib/motion'

const BUTTON_VARIANTS = {
  primary: 'bg-ink text-paper hover:bg-ink-2',
  accent: 'bg-accent text-white hover:brightness-95',
  secondary: 'bg-white text-ink ring-1 ring-line ring-inset hover:ring-ink/40',
  ghost: 'text-ink-2 hover:bg-paper-2',
  danger: 'bg-red-600 text-white hover:bg-red-700',
}

const BUTTON_SIZES = {
  sm: 'h-8 px-3.5 text-[13px]',
  md: 'h-10 px-5 text-sm',
  lg: 'h-13 px-7 text-[15px]',
}

export function Button({ variant = 'primary', size = 'md', loading, className, children, ...props }) {
  return (
    <button
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition-[background-color,box-shadow,filter,transform] duration-300 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <LoaderCircle className="size-4 animate-spin" />}
      {children}
    </button>
  )
}

export function IconButton({ label, className, children, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex size-8 flex-none items-center justify-center rounded-full text-muted transition-colors hover:bg-paper-2 hover:text-ink',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export const inputClass =
  'w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted/70 hover:border-line-strong focus:border-ink focus:ring-4 focus:ring-accent/15 disabled:bg-paper disabled:text-muted'

export function Field({ label, hint, className, children }) {
  const id = useId()
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-ink-2">
          {label}
        </label>
      )}
      {typeof children === 'function' ? children(id) : children}
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  )
}

export function TextInput({ label, hint, className, ...props }) {
  return (
    <Field label={label} hint={hint} className={className}>
      {(id) => <input id={id} className={inputClass} {...props} />}
    </Field>
  )
}

export function TextArea({ label, hint, className, rows = 4, ...props }) {
  return (
    <Field label={label} hint={hint} className={className}>
      {(id) => <textarea id={id} rows={rows} className={cx(inputClass, 'resize-y leading-relaxed')} {...props} />}
    </Field>
  )
}

export function Select({ label, hint, className, options, ...props }) {
  return (
    <Field label={label} hint={hint} className={className}>
      {(id) => (
        <div className="relative">
          <select id={id} className={cx(inputClass, 'appearance-none pr-9')} {...props}>
            {options.map((o) => {
              const [value, text] = Array.isArray(o) ? o : [o, o]
              return (
                <option key={value} value={value}>
                  {text}
                </option>
              )
            })}
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted" />
        </div>
      )}
    </Field>
  )
}

export function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-ink-2">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative h-6 w-10 flex-none rounded-full transition-colors duration-300',
          checked ? 'bg-ink' : 'bg-line-strong',
        )}
      >
        <motion.span
          className="absolute top-1 left-1 size-4 rounded-full bg-white shadow-sm"
          animate={{ x: checked ? 16 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        />
      </button>
    </label>
  )
}

// Segmented control with a sliding highlight.
export function Segmented({ value, options, onChange }) {
  const id = useId()
  return (
    <div className="flex rounded-full bg-paper-2 p-1" role="radiogroup">
      {options.map(([v, text]) => {
        const active = v === value
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(v)}
            className={cx(
              'relative flex-1 rounded-full px-2 py-1.5 text-xs font-medium transition-colors',
              active ? 'text-ink' : 'text-muted hover:text-ink',
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-full bg-white shadow-sm"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative">{text}</span>
          </button>
        )
      })}
    </div>
  )
}

export function Slider({ label, value, min, max, step = 1, unit = '', onChange }) {
  const id = useId()
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-xs">
        <label htmlFor={id} className="font-medium text-ink-2">
          {label}
        </label>
        <span className="font-mono text-muted tabular-nums">
          {value}
          {unit}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-ink"
      />
    </div>
  )
}

export function Modal({ open, title, onClose, children }) {
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      previous?.focus?.()
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 p-3 backdrop-blur-[2px] sm:items-center sm:p-4"
          onMouseDown={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-paper shadow-2xl shadow-ink/20"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.45, ease: EASE_OUT }}
          >
            <div className="flex items-center justify-between px-6 pt-5 pb-2">
              <h2 className="font-serif text-2xl text-ink">{title}</h2>
              <IconButton label="Close" onClick={onClose}>
                <X className="size-4" />
              </IconButton>
            </div>
            <div className="px-6 pt-2 pb-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Spinner({ className }) {
  return <LoaderCircle className={cx('size-5 animate-spin text-ink', className)} aria-label="Loading" />
}

export function FullPageSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Spinner />
    </div>
  )
}

export function Eyebrow({ index, children, className }) {
  return (
    <p className={cx('eyebrow flex items-center gap-2', className)}>
      {index && <span className="text-accent">({index})</span>}
      {children}
    </p>
  )
}
