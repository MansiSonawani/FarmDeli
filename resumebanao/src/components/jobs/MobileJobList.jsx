import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CompanyTile, StagePill } from './JobBits'
import { STAGES, formatDate, groupByStage } from '../../lib/jobs'
import { cx } from '../../lib/cx'

// Small screens: a stage filter and a simple list instead of the wide board.
export default function MobileJobList({ jobs }) {
  const [stage, setStage] = useState('all')
  const groups = groupByStage(jobs)
  const ordered = ['interviewing', 'offer', 'applied', 'wishlist', 'rejected'].flatMap((s) => groups[s])
  const shown = stage === 'all' ? ordered : groups[stage]
  const chips = [['all', 'All', jobs.length], ...STAGES.map((s) => [s.id, s.name, groups[s.id].length])]

  return (
    <div>
      <div role="group" aria-label="Filter by stage" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-4">
        {chips.map(([id, label, count]) => (
          <button
            key={id}
            type="button"
            aria-pressed={stage === id}
            onClick={() => setStage(id)}
            className={cx(
              'inline-flex h-9 flex-none items-center gap-1.5 rounded-full border px-3.5 text-[13px] transition-colors',
              stage === id ? 'border-ink bg-ink text-paper' : 'border-line bg-white text-ink-2',
            )}
          >
            {label}
            <span className="font-mono text-[11px] opacity-70">{count}</span>
          </button>
        ))}
      </div>
      <ul className="flex flex-col gap-2.5">
        {shown.map((job) => (
          <li key={job.id}>
            <Link
              to={`/app/jobs/${job.id}`}
              className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3.5"
            >
              <CompanyTile company={job.company} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">{job.role}</span>
                <span className="block truncate text-[13px] text-muted">
                  {job.company}
                  {job.location ? ` · ${job.location}` : ''}
                </span>
              </span>
              <span className="flex flex-col items-end gap-1.5">
                <StagePill stage={job.stage} />
                <span className="font-mono text-[11px] text-muted">{formatDate(job.applied_on ?? job.created_at)}</span>
              </span>
            </Link>
          </li>
        ))}
        {shown.length === 0 && (
          <li className="rounded-2xl border border-dashed border-line-strong px-4 py-8 text-center text-sm text-muted">
            Nothing in this stage yet.
          </li>
        )}
      </ul>
    </div>
  )
}
