import { Link } from 'react-router-dom'
import { ExternalLink, Plus } from 'lucide-react'
import { CompanyTile, StagePill, StarMark } from './JobBits'
import { STAGES, formatDate, formatSalary, groupByStage, locationLabel } from '../../lib/jobs'
import { hrefFor } from '../../lib/format'

const HEAD = ['Role', 'Stage', 'Location', 'Salary', 'Applied', 'Resume', 'Link']

// Table view: every application on one screen, grouped in stage order.
export default function JobTable({ jobs }) {
  const groups = groupByStage(jobs)
  const rows = STAGES.flatMap((s) => groups[s.id])
  return (
    <div className="overflow-x-auto rounded-[20px] border border-line bg-white">
      <table className="w-full min-w-[1000px] border-collapse text-sm">
        <thead>
          <tr className="text-left">
            {HEAD.map((h) => (
              <th key={h} scope="col" className="eyebrow border-b border-line px-5 py-3.5 font-normal">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((job) => (
            <tr key={job.id} className="transition-colors hover:bg-paper/60">
              <td className="border-b border-paper-2 px-5 py-3.5">
                <Link to={`/app/jobs/${job.id}`} className="flex items-center gap-3">
                  <CompanyTile company={job.company} size="sm" />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 font-semibold">
                      {job.role} {job.starred && <StarMark />}
                    </span>
                    <span className="block text-[13px] text-muted">{job.company}</span>
                  </span>
                </Link>
              </td>
              <td className="border-b border-paper-2 px-5 py-3.5">
                <StagePill stage={job.stage} />
              </td>
              <td className="border-b border-paper-2 px-5 py-3.5 text-ink-2">{locationLabel(job) || '—'}</td>
              <td className="border-b border-paper-2 px-5 py-3.5 text-ink-2">{formatSalary(job) || '—'}</td>
              <td className="border-b border-paper-2 px-5 py-3.5 font-mono text-xs text-muted">
                {job.applied_on ? formatDate(job.applied_on) : '—'}
              </td>
              <td className="border-b border-paper-2 px-5 py-3.5 text-ink-2">{job.resume_snapshot?.title ?? '—'}</td>
              <td className="border-b border-paper-2 px-5 py-3.5">
                {job.url ? (
                  <a
                    href={hrefFor(job.url, 'url')}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open posting for ${job.role} at ${job.company}`}
                    className="inline-flex items-center gap-1 text-[13px] text-ink-2 hover:text-ink"
                  >
                    Open <ExternalLink className="size-3.5" />
                  </a>
                ) : (
                  <Link
                    to={`/app/jobs/${job.id}`}
                    state={{ addLink: true }}
                    aria-label={`Add a link for ${job.role} at ${job.company}`}
                    className="inline-flex items-center gap-1 text-[13px] font-medium text-accent-ink hover:underline"
                  >
                    <Plus className="size-3.5" /> Add link
                  </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
