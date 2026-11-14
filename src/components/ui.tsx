import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Mode } from '../types'
import { MODE_LABEL } from '../data/muscles'

export const cx = (...v: (string | false | null | undefined)[]) => v.filter(Boolean).join(' ')

export function Page({
  title,
  back,
  right,
  children,
}: {
  title: ReactNode
  back?: boolean | string
  right?: ReactNode
  children: ReactNode
}) {
  const nav = useNavigate()
  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col">
      <header className="safe-t sticky top-0 z-20 border-b border-line bg-bg/95 backdrop-blur">
        <div className="flex min-h-14 items-center gap-2 px-4 py-2">
          {back && (
            <button
              aria-label="Voltar"
              className="-ml-2 grid h-11 w-11 place-items-center rounded-full text-2xl text-mut active:bg-card2"
              onClick={() => (typeof back === 'string' ? nav(back) : nav(-1))}
            >
              ‹
            </button>
          )}
          <h1 className="min-w-0 flex-1 truncate text-lg font-semibold">{title}</h1>
          {right}
        </div>
      </header>
      <main className="flex-1 space-y-3 px-4 pt-3 pb-28">{children}</main>
    </div>
  )
}

export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={cx('rounded-2xl border border-line bg-card p-4', onClick && 'cursor-pointer active:bg-card2', className)}
    >
      {children}
    </div>
  )
}

export function Btn({
  children,
  onClick,
  kind = 'primary',
  className,
  disabled,
  small,
}: {
  children: ReactNode
  onClick?: () => void
  kind?: 'primary' | 'ghost' | 'danger' | 'soft'
  className?: string
  disabled?: boolean
  small?: boolean
}) {
  const styles = {
    primary: 'bg-acc text-accfg font-semibold',
    soft: 'bg-card2 text-fg border border-line',
    ghost: 'text-mut',
    danger: 'bg-bad/15 text-bad border border-bad/40',
  }[kind]
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cx(
        'rounded-xl px-4 transition active:scale-[0.98] disabled:opacity-40',
        small ? 'min-h-10 text-sm' : 'min-h-13 text-base',
        styles,
        className,
      )}
    >
      {children}
    </button>
  )
}

export function Chip({
  children,
  active,
  onClick,
  className,
}: {
  children: ReactNode
  active?: boolean
  onClick?: () => void
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'shrink-0 rounded-full border px-3 py-1.5 text-sm whitespace-nowrap',
        active ? 'border-acc bg-acc/15 text-acc' : 'border-line bg-card text-mut',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function ModeBadge({ mode }: { mode: Mode }) {
  return (
    <span
      className={cx(
        'rounded-full px-2 py-0.5 text-xs font-semibold',
        mode === 'low' ? 'bg-low/15 text-low' : 'bg-high/15 text-high',
      )}
    >
      {MODE_LABEL[mode]}
    </span>
  )
}

/** painel inferior modal */
export function Sheet({
  open,
  onClose,
  title,
  children,
  full,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  full?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={cx(
          'safe-b flex w-full max-w-xl flex-col rounded-t-3xl border-t border-line bg-bg',
          full ? 'h-[92%]' : 'max-h-[88%]',
        )}
      >
        <div className="flex items-center gap-2 px-4 pt-3 pb-2">
          <div className="min-w-0 flex-1 truncate text-base font-semibold">{title}</div>
          <button aria-label="Fechar" className="grid h-10 w-10 place-items-center rounded-full bg-card2 text-mut" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-6">{children}</div>
      </div>
    </div>
  )
}

export const parseNum = (v: string): number => {
  const n = Number(v.replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? n : 0
}

/** campo numérico grande; aceita vírgula; valor 0 aparece vazio (mostra o placeholder) */
export function NumInput({
  value,
  onChange,
  placeholder,
  className,
  label,
  decimal,
}: {
  value: number
  onChange: (n: number) => void
  placeholder?: string
  className?: string
  label?: string
  decimal?: boolean
}) {
  const [text, setText] = useState(value ? String(value).replace('.', ',') : '')
  useEffect(() => {
    setText((t) => (parseNum(t) === value ? t : value ? String(value).replace('.', ',') : ''))
  }, [value])
  return (
    <input
      aria-label={label}
      inputMode={decimal ? 'decimal' : 'numeric'}
      value={text}
      placeholder={placeholder}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        const t = e.target.value.replace(decimal ? /[^0-9.,]/g : /[^0-9]/g, '')
        setText(t)
        onChange(parseNum(t))
      }}
      className={cx(
        'num h-12 w-full min-w-0 rounded-xl border border-line bg-card2 text-center text-lg font-semibold outline-none placeholder:font-normal placeholder:text-mut/60 focus:border-acc',
        className,
      )}
    />
  )
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  step = 1,
  label,
}: {
  value: number
  onChange: (n: number) => void
  min?: number
  max?: number
  step?: number
  label: string
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-mut">{label}</span>
      <div className="flex items-center gap-1">
        <button
          aria-label={`Diminuir ${label}`}
          className="h-10 w-10 rounded-lg bg-card2 text-xl"
          onClick={() => onChange(Math.max(min, value - step))}
        >
          −
        </button>
        <span className="num w-12 text-center font-semibold">{value}</span>
        <button
          aria-label={`Aumentar ${label}`}
          className="h-10 w-10 rounded-lg bg-card2 text-xl"
          onClick={() => onChange(Math.min(max, value + step))}
        >
          +
        </button>
      </div>
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-mut">{children}</div>
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between pt-2">
      <h2 className="text-xs font-semibold tracking-wider text-mut uppercase">{children}</h2>
      {right}
    </div>
  )
}

export const dateFmt = (iso: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: '2-digit', month: 'short' }) =>
  new Date(iso).toLocaleDateString('pt-BR', opts)

export const durationMin = (start: string, end?: string) =>
  end ? Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)) : 0
