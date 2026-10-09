import { forwardRef } from 'react'
import { Link } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { CompanyTile, NextStepBadge, StarMark } from './JobBits'
import { cardDate, formatNextStep, formatSalary, locationLabel } from '../../lib/jobs'
import { cx } from '../../lib/cx'

function isOverdue(job) {
  if (!job.next_step_at) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(job.next_step_at) < today
}

// The card shown on the board. Rendered as a link to the job, or as a plain
// block for the floating copy that follows the pointer while dragging.
const JobCard = forwardRef(function JobCard({ job, asLink = true, lifted = false, className, ...props }, ref) {
  const salary = formatSalary(job)
  const location = locationLabel(job)
  const next = formatNextStep(job)
  const Component = asLink ? Link : 'div'
  const linkProps = asLink ? { to: `/app/jobs/${job.id}` } : {}

  return (
    <Component
      ref={ref}
      {...linkProps}
      {...props}
      className={cx(
        'flex flex-col gap-3 rounded-[14px] border border-line bg-white p-3.5 text-ink shadow-[0_1px_2px_rgb(18_18_17/0.04)] transition-[box-shadow,border-color] duration-300 outline-none hover:border-line-strong focus-visible:ring-2 focus-visible:ring-accent',
        lifted && 'rotate-[1.5deg] border-line-strong shadow-[0_24px_40px_-16px_rgb(18_18_17/0.35)]',
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        <CompanyTile company={job.company} />
        <div className="min-w-0 flex-1">
          <div className="text-sm leading-snug font-semibold">{job.role}</div>
          <div className="mt-0.5 truncate text-[13px] text-muted">{job.company}</div>
        </div>
        {job.starred && <StarMark />}
      </div>
      {(location || salary) && (
        <div className="flex flex-wrap gap-1.5">
          {location && <span className="rounded-full bg-paper px-2.5 py-0.5 text-xs text-ink-2">{location}</span>}
          {salary && <span className="rounded-full bg-paper px-2.5 py-0.5 text-xs text-ink-2">{salary}</span>}
        </div>
      )}
      {next && <NextStepBadge text={next} overdue={isOverdue(job)} />}
      <div className="flex items-center justify-between gap-2 border-t border-paper-2 pt-2.5">
        <span className="font-mono text-[11px] text-muted">{cardDate(job)}</span>
        {job.resume_snapshot?.title && (
          <span className="inline-flex min-w-0 items-center gap-1 text-xs text-ink-2">
            <FileText className="size-3.5 flex-none" aria-hidden="true" />
            <span className="truncate">{job.resume_snapshot.title}</span>
          </span>
        )}
      </div>
    </Component>
  )
})

export default JobCard
