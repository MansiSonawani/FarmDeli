import { CalendarClock, Star } from 'lucide-react'
import { STAGE_BY_ID, tileColor } from '../../lib/jobs'
import { cx } from '../../lib/cx'

export function CompanyTile({ company, size = 'md' }) {
  const sizes = {
    sm: 'size-8 rounded-[9px] text-lg',
    md: 'size-[34px] rounded-[10px] text-xl',
    lg: 'size-14 rounded-2xl text-[32px]',
  }
  return (
    <span
      aria-hidden="true"
      className={cx('flex flex-none items-center justify-center font-serif text-ink italic', sizes[size])}
      style={{ background: tileColor(company) }}
    >
      {(company || '?').trim().charAt(0).toUpperCase()}
    </span>
  )
}

export function StagePill({ stage }) {
  const s = STAGE_BY_ID[stage]
  return (
    <span
      className="inline-block rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap"
      style={{ background: s.pillBg, color: s.pillFg }}
    >
      {s.name}
    </span>
  )
}

export function StageDot({ stage, className }) {
  return (
    <span
      aria-hidden="true"
      className={cx('inline-block size-2 flex-none rounded-full', className)}
      style={{ background: STAGE_BY_ID[stage].dot }}
    />
  )
}

export function StarMark() {
  return <Star className="size-[15px] flex-none fill-accent text-accent" aria-label="Starred" />
}

export function NextStepBadge({ text, overdue }) {
  return (
    <div
      className={cx(
        'flex items-center gap-2 rounded-[10px] px-2.5 py-2 text-xs',
        overdue ? 'bg-red-50 text-red-800' : 'bg-accent-soft text-[#7a2a0b]',
      )}
    >
      <CalendarClock className="size-3.5 flex-none" aria-hidden="true" />
      <span className="min-w-0">
        {overdue && <span className="font-semibold">Overdue · </span>}
        {text}
      </span>
    </div>
  )
}
