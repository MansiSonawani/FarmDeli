import { Link } from 'react-router-dom'
import { formatWhen, pipelineCounts } from '../../lib/jobs'
import { cx } from '../../lib/cx'

// Pipeline bar (how many jobs sit in each stage) and the next few deadlines.
export default function Overview({ jobs, upcoming }) {
  const counts = pipelineCounts(jobs)
  const active = jobs.filter((j) => j.stage !== 'rejected').length
  const offers = counts.find((c) => c.id === 'offer').count

  return (
    <section aria-label="Overview" className="grid gap-8 py-8 md:grid-cols-2 md:gap-10">
      <div className="flex min-w-0 flex-col gap-3.5">
        <div className="flex items-baseline justify-between">
          <span className="eyebrow">Pipeline</span>
          <span className="text-[13px] text-ink-2">
            {active} active · {offers} {offers === 1 ? 'offer' : 'offers'}
          </span>
        </div>
        <div className="flex h-2.5 gap-1" aria-hidden="true">
          {jobs.length === 0 ? (
            <div className="flex-1 rounded bg-paper-3" />
          ) : (
            counts
              .filter((c) => c.count > 0)
              .map((c) => <div key={c.id} className="rounded" style={{ flex: `${c.count} 1 0`, background: c.dot }} />)
          )}
        </div>
        <ul className="flex flex-wrap gap-x-5 gap-y-1.5">
          {counts.map((c) => (
            <li key={c.id} className="inline-flex items-center gap-2 text-[13px] text-ink-2">
              <span className="size-2 rounded-full" style={{ background: c.dot }} aria-hidden="true" />
              {c.name}
              <span className="font-mono text-xs text-muted">{c.count}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex min-w-0 flex-col gap-2.5">
        <span className="eyebrow">Next up</span>
        {upcoming.length === 0 ? (
          <p className="rounded-[14px] border border-dashed border-line-strong px-4 py-3 text-sm text-muted">
            No upcoming steps. Add a next step to a job to see it here.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {upcoming.map(({ job, overdue }) => (
              <li key={job.id}>
                <Link
                  to={`/app/jobs/${job.id}`}
                  className="flex items-center gap-3.5 rounded-[14px] border border-line bg-white px-3.5 py-2.5 transition-colors hover:border-line-strong"
                >
                  <span
                    className={cx('size-2 flex-none rounded-full', overdue ? 'bg-red-600' : 'bg-accent')}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {job.next_step || 'Next step'} <span className="font-normal text-muted">· {job.company}</span>
                  </span>
                  <span
                    className={cx(
                      'shrink-0 font-mono text-xs whitespace-nowrap',
                      overdue ? 'text-red-700' : 'text-ink-2',
                    )}
                  >
                    {overdue ? 'Overdue · ' : ''}
                    {formatWhen(job.next_step_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
