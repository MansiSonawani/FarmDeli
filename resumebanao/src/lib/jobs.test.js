import { describe, expect, it } from 'vitest'
import {
  filterJobs,
  formatSalary,
  groupByStage,
  movePatch,
  newJob,
  parseSalaryRange,
  positionBetween,
  upcomingSteps,
} from './jobs'
import { buildIcs } from './ics'

const NOW = new Date('2026-10-09T10:00:00')

describe('positionBetween', () => {
  it('handles empty columns and edges', () => {
    expect(positionBetween(null, null)).toBe(1024)
    expect(positionBetween(null, 1024)).toBe(0)
    expect(positionBetween(2048, null)).toBe(3072)
  })

  it('picks the midpoint between neighbours', () => {
    expect(positionBetween(1024, 2048)).toBe(1536)
  })
})

describe('newJob', () => {
  it('starts the timeline and fills the application date outside the wishlist', () => {
    const job = newJob({ role: 'Engineer', company: 'Acme', stage: 'applied' }, NOW)
    expect(job.applied_on).toBe('2026-10-09')
    expect(job.events).toHaveLength(1)
    expect(job.events[0].title).toBe('Added as Applied')
  })

  it('leaves the application date empty for wishlist jobs', () => {
    expect(newJob({ role: 'Engineer', company: 'Acme' }, NOW).applied_on).toBeNull()
  })
})

describe('movePatch', () => {
  const job = { stage: 'wishlist', applied_on: null, events: [] }

  it('logs a stage change and sets the application date', () => {
    const patch = movePatch(job, 'applied', 10, NOW)
    expect(patch).toMatchObject({ stage: 'applied', position: 10, applied_on: '2026-10-09' })
    expect(patch.events[0]).toMatchObject({ type: 'stage', title: 'Moved to Applied', detail: 'from Wishlist' })
  })

  it('only changes the position when reordering within a column', () => {
    expect(movePatch(job, 'wishlist', 5, NOW)).toEqual({ stage: 'wishlist', position: 5 })
  })
})

describe('groupByStage', () => {
  it('groups and sorts by position', () => {
    const groups = groupByStage([
      { id: 'b', stage: 'applied', position: 2 },
      { id: 'a', stage: 'applied', position: 1 },
      { id: 'c', stage: 'offer', position: 1 },
    ])
    expect(groups.applied.map((j) => j.id)).toEqual(['a', 'b'])
    expect(groups.offer.map((j) => j.id)).toEqual(['c'])
    expect(groups.wishlist).toEqual([])
  })
})

describe('salary', () => {
  it('formats ranges in LPA', () => {
    expect(formatSalary({ salary_min: 18, salary_max: 24 })).toBe('₹18–24 LPA')
    expect(formatSalary({ salary_min: 21, salary_max: 21 })).toBe('₹21 LPA')
    expect(formatSalary({ salary_min: 12, salary_max: null })).toBe('₹12+ LPA')
    expect(formatSalary({ salary_min: null, salary_max: null })).toBe('')
  })

  it('parses free-text ranges', () => {
    expect(parseSalaryRange('18–24')).toEqual([18, 24])
    expect(parseSalaryRange('₹22 LPA')).toEqual([22, 22])
    expect(parseSalaryRange('24 - 18.5')).toEqual([18.5, 24])
    expect(parseSalaryRange('')).toEqual([null, null])
  })
})

describe('filterJobs', () => {
  const jobs = [
    { company: 'Monsoon Labs', role: 'Frontend Engineer', work_mode: 'hybrid', source: 'referral', starred: true },
    { company: 'Kestrel Pay', role: 'UI Engineer', work_mode: 'remote', source: 'linkedin', starred: false },
  ]

  it('searches company and role', () => {
    expect(filterJobs(jobs, { query: 'kestrel' })).toHaveLength(1)
    expect(filterJobs(jobs, { query: 'engineer' })).toHaveLength(2)
  })

  it('applies quick filters', () => {
    expect(filterJobs(jobs, { filter: 'remote' })[0].company).toBe('Kestrel Pay')
    expect(filterJobs(jobs, { filter: 'referral' })[0].company).toBe('Monsoon Labs')
    expect(filterJobs(jobs, { filter: 'starred' })).toHaveLength(1)
  })
})

describe('upcomingSteps', () => {
  it('lists soonest first, flags overdue, skips rejected and stale ones', () => {
    const jobs = [
      { id: 'later', stage: 'applied', next_step_at: '2026-10-15T11:00:00' },
      { id: 'soon', stage: 'interviewing', next_step_at: '2026-10-10T09:00:00' },
      { id: 'overdue', stage: 'applied', next_step_at: '2026-10-07T09:00:00' },
      { id: 'stale', stage: 'applied', next_step_at: '2026-09-01T09:00:00' },
      { id: 'closed', stage: 'rejected', next_step_at: '2026-10-11T09:00:00' },
    ]
    const steps = upcomingSteps(jobs, NOW)
    expect(steps.map((s) => s.job.id)).toEqual(['overdue', 'soon', 'later'])
    expect(steps[0].overdue).toBe(true)
    expect(steps[1].overdue).toBe(false)
  })
})

describe('buildIcs', () => {
  it('builds a timed event with escaped text', () => {
    const ics = buildIcs({
      id: 'job-1',
      title: 'Technical round, Monsoon Labs',
      start: '2026-10-14T05:30:00Z',
      now: new Date('2026-10-09T00:00:00Z'),
    })
    expect(ics).toContain('DTSTART:20261014T053000Z')
    expect(ics).toContain('DTEND:20261014T063000Z')
    expect(ics).toContain('SUMMARY:Technical round\\, Monsoon Labs')
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
  })

  it('builds an all-day event', () => {
    const ics = buildIcs({ id: 'x', title: 'Reply to offer', start: new Date(2026, 9, 20), allDay: true })
    expect(ics).toContain('DTSTART;VALUE=DATE:20261020')
    expect(ics).toContain('DTEND;VALUE=DATE:20261021')
  })
})

describe('date and time helpers', () => {
  it('round-trips a date with a time', async () => {
    const { combineDateTime, splitDateTime } = await import('./jobs')
    const iso = combineDateTime('2026-10-14', '11:30')
    expect(splitDateTime(iso)).toEqual(['2026-10-14', '11:30'])
  })

  it('treats a date without a time as all-day', async () => {
    const { combineDateTime, splitDateTime, hasTime } = await import('./jobs')
    const iso = combineDateTime('2026-10-20', '')
    expect(hasTime(iso)).toBe(false)
    expect(splitDateTime(iso)).toEqual(['2026-10-20', ''])
    expect(combineDateTime('', '10:00')).toBeNull()
  })
})

describe('snapshotOf', () => {
  it('copies the resume so later edits do not change it', async () => {
    const { snapshotOf } = await import('./jobs')
    const resume = { title: 'CV', data: { personal: { fullName: 'A' } }, style: { layout: 'one' } }
    const snap = snapshotOf(resume, NOW)
    resume.data.personal.fullName = 'B'
    expect(snap).toMatchObject({ title: 'CV', data: { personal: { fullName: 'A' } }, at: NOW.toISOString() })
  })
})

describe('normalizeUrl', () => {
  it('adds https:// when the scheme is missing', async () => {
    const { normalizeUrl } = await import('./jobs')
    expect(normalizeUrl(' careers.example.com/jobs/1 ')).toBe('https://careers.example.com/jobs/1')
    expect(normalizeUrl('http://example.com')).toBe('http://example.com')
    expect(normalizeUrl('HTTPS://Example.com/a')).toBe('HTTPS://Example.com/a')
    expect(normalizeUrl('  ')).toBe('')
  })
})

describe('formatWhen', () => {
  it('shows the time only when one was set', async () => {
    const { formatWhen } = await import('./jobs')
    expect(formatWhen(new Date(2026, 9, 11, 11, 0).toISOString())).toBe('Sun 11 Oct, 11:00')
    expect(formatWhen(new Date(2026, 9, 20).toISOString())).toBe('Tue 20 Oct')
    expect(formatWhen(null)).toBe('')
  })
})
