import { uid } from './id'

// Pure helpers for the job tracker. No React, no storage – easy to test.

export const STAGES = [
  { id: 'wishlist', name: 'Wishlist', dot: '#a8a59c', pillBg: '#ebe8e1', pillFg: '#4a4843' },
  { id: 'applied', name: 'Applied', dot: '#2f4fb3', pillBg: '#e3e8f7', pillFg: '#233c8c' },
  { id: 'interviewing', name: 'Interviewing', dot: '#ff5a1f', pillBg: '#ffe4d8', pillFg: '#8f310c' },
  { id: 'offer', name: 'Offer', dot: '#0f766e', pillBg: '#d9efe9', pillFg: '#0b5a54' },
  { id: 'rejected', name: 'Rejected', dot: '#c8c3b8', pillBg: '#efece6', pillFg: '#67655e' },
]

export const STAGE_BY_ID = Object.fromEntries(STAGES.map((s) => [s.id, s]))

export const WORK_MODES = [
  ['onsite', 'On-site'],
  ['hybrid', 'Hybrid'],
  ['remote', 'Remote'],
]

export const SOURCES = [
  ['', 'Not set'],
  ['referral', 'Referral'],
  ['linkedin', 'LinkedIn'],
  ['naukri', 'Naukri'],
  ['website', 'Company website'],
  ['campus', 'Campus placement'],
  ['recruiter', 'Recruiter reached out'],
  ['other', 'Other'],
]

export const SOURCE_LABEL = Object.fromEntries(SOURCES)
export const WORK_MODE_LABEL = Object.fromEntries(WORK_MODES)

const TILE_COLORS = [
  '#d8e7ef',
  '#efe6cf',
  '#d9efe9',
  '#fbe6c9',
  '#e6e1f5',
  '#dcefe6',
  '#f3dfe8',
  '#dfe6f3',
  '#e4ecd9',
  '#f3e3d6',
]

// A stable soft colour per company for its initial tile.
export function tileColor(company = '') {
  let hash = 0
  for (const ch of company.toLowerCase()) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return TILE_COLORS[hash % TILE_COLORS.length]
}

export function todayISO(now = new Date()) {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

export function makeEvent(title, { detail = '', type = 'note', at = new Date().toISOString() } = {}) {
  return { id: uid(), type, title, detail, at }
}

// A new job with sensible defaults and its first timeline entry.
export function newJob(values, now = new Date()) {
  const stage = values.stage ?? 'wishlist'
  const job = {
    role: '',
    company: '',
    url: '',
    location: '',
    work_mode: null,
    stage,
    position: 0,
    applied_on: null,
    salary_min: null,
    salary_max: null,
    salary_expected: null,
    source: '',
    referrer: '',
    resume_id: null,
    resume_snapshot: null,
    description: '',
    notes: '',
    next_step: '',
    next_step_at: null,
    starred: false,
    contacts: [],
    ...values,
  }
  if (stage !== 'wishlist' && !job.applied_on) job.applied_on = todayISO(now)
  const title = stage === 'wishlist' ? 'Saved to Wishlist' : `Added as ${STAGE_BY_ID[stage].name}`
  job.events = [makeEvent(title, { type: 'stage', at: now.toISOString() })]
  return job
}

// Fractional ordering: a position between two neighbours (either may be missing).
export function positionBetween(before, after) {
  if (before == null && after == null) return 1024
  if (before == null) return after - 1024
  if (after == null) return before + 1024
  return (before + after) / 2
}

// The patch that moves a job to `stage` at `position`, logging stage changes
// and filling in the application date the first time it leaves the wishlist.
export function movePatch(job, stage, position, now = new Date()) {
  const patch = { stage, position }
  if (stage !== job.stage) {
    patch.events = [
      ...(job.events ?? []),
      makeEvent(`Moved to ${STAGE_BY_ID[stage].name}`, {
        type: 'stage',
        detail: `from ${STAGE_BY_ID[job.stage]?.name ?? job.stage}`,
        at: now.toISOString(),
      }),
    ]
    if (stage !== 'wishlist' && !job.applied_on) patch.applied_on = todayISO(now)
  }
  return patch
}

export function sortByPosition(jobs) {
  return [...jobs].sort((a, b) => a.position - b.position || (a.created_at ?? '').localeCompare(b.created_at ?? ''))
}

// { wishlist: [job…], applied: […], … } each sorted by position.
export function groupByStage(jobs) {
  const groups = Object.fromEntries(STAGES.map((s) => [s.id, []]))
  for (const job of sortByPosition(jobs)) (groups[job.stage] ?? groups.wishlist).push(job)
  return groups
}

export function lastPosition(jobs, stage) {
  const inStage = jobs.filter((j) => j.stage === stage)
  return inStage.length ? Math.max(...inStage.map((j) => j.position)) + 1024 : 1024
}

const trimNumber = (n) => String(Number(n)).replace(/\.0+$/, '')

export function formatSalary(job) {
  const { salary_min: min, salary_max: max } = job
  if (min != null && max != null)
    return min === max ? `₹${trimNumber(min)} LPA` : `₹${trimNumber(min)}–${trimNumber(max)} LPA`
  if (min != null) return `₹${trimNumber(min)}+ LPA`
  if (max != null) return `Up to ₹${trimNumber(max)} LPA`
  return ''
}

// "18-24", "18 – 24", "18", "₹22 LPA" → [min, max]
export function parseSalaryRange(text) {
  const numbers = (text || '').match(/\d+(?:\.\d+)?/g)?.map(Number) ?? []
  if (numbers.length === 0) return [null, null]
  if (numbers.length === 1) return [numbers[0], numbers[0]]
  return [Math.min(numbers[0], numbers[1]), Math.max(numbers[0], numbers[1])]
}

export function salaryRangeText(job) {
  const { salary_min: min, salary_max: max } = job
  if (min == null && max == null) return ''
  if (min === max || max == null) return trimNumber(min)
  if (min == null) return trimNumber(max)
  return `${trimNumber(min)}–${trimNumber(max)}`
}

export function locationLabel(job) {
  return [job.location, WORK_MODE_LABEL[job.work_mode]].filter(Boolean).join(' · ')
}

const DAY_FORMAT = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
const DATE_FORMAT = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' })
const TIME_FORMAT = new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })

export function formatDay(iso) {
  return iso ? DAY_FORMAT.format(new Date(iso)).replace(',', '') : ''
}

export function formatDate(iso) {
  return iso ? DATE_FORMAT.format(new Date(iso)) : ''
}

// A next-step time stored at local midnight is treated as an all-day date.
export function hasTime(iso) {
  const d = new Date(iso)
  return d.getHours() !== 0 || d.getMinutes() !== 0
}

// "Sun 11 Oct, 11:00", or "Sun 11 Oct" for an all-day step.
export function formatWhen(iso) {
  if (!iso) return ''
  return `${formatDay(iso)}${hasTime(iso) ? `, ${TIME_FORMAT.format(new Date(iso))}` : ''}`
}

export function formatNextStep(job) {
  if (!job.next_step && !job.next_step_at) return ''
  return [job.next_step || 'Next step', formatWhen(job.next_step_at)].filter(Boolean).join(' · ')
}

// The card's date line: the most meaningful date for its stage.
export function cardDate(job) {
  if (job.stage === 'wishlist') return `Saved ${formatDate(job.created_at)}`
  if (job.applied_on) return `Applied ${formatDate(job.applied_on)}`
  return `Added ${formatDate(job.created_at)}`
}

// Upcoming next steps, soonest first. Overdue ones (up to a week old) stay listed.
export function upcomingSteps(jobs, now = new Date(), limit = 3) {
  const weekAgo = now.getTime() - 7 * 86400000
  return jobs
    .filter((j) => j.next_step_at && j.stage !== 'rejected' && new Date(j.next_step_at).getTime() >= weekAgo)
    .sort((a, b) => a.next_step_at.localeCompare(b.next_step_at))
    .slice(0, limit)
    .map((j) => ({ job: j, overdue: new Date(j.next_step_at).getTime() < startOfDay(now) }))
}

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export const FILTERS = [
  ['all', 'All'],
  ['remote', 'Remote'],
  ['referral', 'Referrals'],
  ['starred', 'Starred'],
]

export function filterJobs(jobs, { query = '', filter = 'all' } = {}) {
  const q = query.trim().toLowerCase()
  return jobs.filter((j) => {
    if (q && !`${j.company} ${j.role} ${j.location ?? ''}`.toLowerCase().includes(q)) return false
    if (filter === 'remote') return j.work_mode === 'remote'
    if (filter === 'referral') return j.source === 'referral'
    if (filter === 'starred') return j.starred
    return true
  })
}

export function pipelineCounts(jobs) {
  return STAGES.map((s) => ({ ...s, count: jobs.filter((j) => j.stage === s.id).length }))
}

// A frozen copy of a resume at the moment it is attached to an application.
export function snapshotOf(resume, now = new Date()) {
  if (!resume) return null
  return {
    title: resume.title,
    data: structuredClone(resume.data),
    style: structuredClone(resume.style),
    at: now.toISOString(),
  }
}

const pad = (n) => String(n).padStart(2, '0')

// <input type="date"> + optional <input type="time"> (local) → ISO string.
// Without a time the step is stored at local midnight and shown as all-day.
export function combineDateTime(date, time) {
  if (!date) return null
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time ? time.split(':').map(Number) : [0, 0]
  return new Date(y, m - 1, d, hh, mm).toISOString()
}

// ISO string → ['YYYY-MM-DD', 'HH:MM' | ''] in local time.
export function splitDateTime(iso) {
  if (!iso) return ['', '']
  const d = new Date(iso)
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  return [date, hasTime(iso) ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : '']
}

// Example applications for trying the tracker. Fictional companies.
export function sampleJobs(now = new Date()) {
  const inDays = (days, hour = 0) => {
    const d = new Date(now)
    d.setDate(d.getDate() + days)
    d.setHours(hour, 0, 0, 0)
    return d.toISOString()
  }
  return [
    {
      role: 'Product Designer',
      company: 'Coral Learning',
      location: '',
      work_mode: 'remote',
      stage: 'wishlist',
      salary_min: 16,
      salary_max: 20,
      starred: true,
    },
    { role: 'React Engineer', company: 'Orbit Freight', location: '', work_mode: 'remote', stage: 'wishlist' },
    {
      role: 'Frontend Engineer',
      company: 'Saffron Analytics',
      location: 'Bengaluru',
      work_mode: 'onsite',
      stage: 'applied',
      salary_min: 18,
      salary_max: 22,
      source: 'linkedin',
      next_step: 'Follow up',
      next_step_at: inDays(3),
    },
    {
      role: 'UI Engineer',
      company: 'Lumen Grid',
      location: 'Hyderabad',
      work_mode: 'hybrid',
      stage: 'applied',
      salary_min: 15,
      salary_max: 19,
      source: 'referral',
      referrer: 'A friend',
    },
    {
      role: 'Frontend Engineer',
      company: 'Monsoon Labs',
      location: 'Bengaluru',
      work_mode: 'hybrid',
      stage: 'interviewing',
      salary_min: 18,
      salary_max: 24,
      source: 'referral',
      next_step: 'Technical round',
      next_step_at: inDays(2, 11),
      starred: true,
    },
    {
      role: 'Frontend Engineer',
      company: 'Tarang Health',
      location: 'Pune',
      work_mode: 'hybrid',
      stage: 'offer',
      salary_min: 21,
      salary_max: 21,
      next_step: 'Reply to offer',
      next_step_at: inDays(8),
    },
  ]
}

// People paste links without the scheme ("careers.example.com/123"); store them
// as absolute URLs so they open correctly everywhere.
export function normalizeUrl(value) {
  const url = (value || '').trim()
  if (!url) return ''
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(url) ? url : `https://${url.replace(/^\/+/, '')}`
}
