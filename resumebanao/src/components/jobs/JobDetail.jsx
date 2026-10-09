import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowLeft, CalendarPlus, Check, ExternalLink, Link2, Mail, RefreshCw, Star, Trash2, X } from 'lucide-react'
import ResumeThumbnail from '../resume/ResumeThumbnail'
import { Button, IconButton, Segmented, Select, TextArea, TextInput } from '../ui'
import { CompanyTile, StagePill } from './JobBits'
import {
  SOURCES,
  STAGES,
  WORK_MODES,
  combineDateTime,
  formatDate,
  formatNextStep,
  hasTime,
  locationLabel,
  makeEvent,
  normalizeUrl,
  parseSalaryRange,
  salaryRangeText,
  snapshotOf,
  splitDateTime,
  todayISO,
} from '../../lib/jobs'
import { buildIcs, downloadIcs } from '../../lib/ics'
import { hrefFor } from '../../lib/format'
import { uid } from '../../lib/id'
import { DEFAULT_STYLE } from '../../lib/defaults'
import { cx } from '../../lib/cx'

const TYPING = { delay: 600 } // debounce for text fields
const TABS = [
  ['overview', 'Overview'],
  ['timeline', 'Timeline'],
  ['contacts', 'Contacts'],
  ['notes', 'Notes'],
]
const PIPELINE = STAGES.filter((s) => s.id !== 'rejected')

// Everything about one application. Edits save automatically.
// Rendered with key={job.id}, so local state starts fresh for each job.
export default function JobDetail({
  job,
  resumes,
  onUpdate,
  onMove,
  onDelete,
  onClose,
  notify,
  startAddingLink = false,
}) {
  const [tab, setTab] = useState('overview')
  const [addingLink, setAddingLink] = useState(startAddingLink && !job.url)
  const edit = (patch, opts) => onUpdate(job.id, patch, opts)

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-none items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-8">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-2 text-sm text-ink-2 transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-4" /> All applications
        </button>
        <div className="flex items-center gap-1.5">
          {job.url ? (
            <a
              href={hrefFor(job.url, 'url')}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] ring-1 ring-line transition ring-inset hover:ring-ink/40"
            >
              Open posting <ExternalLink className="size-3.5" />
            </a>
          ) : (
            !addingLink && (
              <Button size="sm" variant="secondary" onClick={() => setAddingLink(true)}>
                <Link2 className="size-3.5" /> Add job link
              </Button>
            )
          )}
          <IconButton
            label={job.starred ? 'Remove star' : 'Star this job'}
            onClick={() => edit({ starred: !job.starred })}
          >
            <Star className={cx('size-4', job.starred && 'fill-accent text-accent')} />
          </IconButton>
          <IconButton
            label="Delete job"
            className="hover:text-red-600"
            onClick={() => {
              if (confirm(`Delete "${job.role}" at ${job.company}? This cannot be undone.`)) onDelete(job.id)
            }}
          >
            <Trash2 className="size-4" />
          </IconButton>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {addingLink && (
          <AddLinkForm
            onSave={(url) => {
              edit({ url })
              setAddingLink(false)
              notify('Job link saved')
            }}
            onCancel={() => setAddingLink(false)}
          />
        )}
        <div className="flex flex-col gap-6 px-5 pt-7 sm:px-8">
          <div className="flex items-center gap-4">
            <CompanyTile company={job.company} size="lg" />
            <div className="min-w-0">
              <h2 className="text-[clamp(1.6rem,4vw,2.1rem)] leading-[1.05] font-medium tracking-[-0.035em]">
                {job.role}
              </h2>
              <p className="mt-1.5 text-[15px] text-ink-2">
                {job.company}
                {locationLabel(job) && <span className="text-muted"> · {locationLabel(job)}</span>}
              </p>
            </div>
          </div>

          <StageBar job={job} onMove={(stage) => onMove(job.id, stage)} />
          <NextStep job={job} edit={edit} notify={notify} />

          <div role="tablist" aria-label="Job sections" className="flex gap-6 border-b border-line">
            {TABS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`tab-${id}`}
                aria-selected={tab === id}
                aria-controls={`panel-${id}`}
                onClick={() => setTab(id)}
                className={cx(
                  'relative py-3 text-sm font-medium transition-colors',
                  tab === id ? 'text-ink' : 'text-muted hover:text-ink',
                )}
              >
                {label}
                {id === 'contacts' && job.contacts?.length > 0 && (
                  <span className="ml-1.5 font-mono text-[11px] text-muted">{job.contacts.length}</span>
                )}
                {tab === id && (
                  <motion.span
                    layoutId="job-tab"
                    className="absolute inset-x-0 -bottom-px h-0.5 bg-ink"
                    transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="px-5 pt-6 pb-10 sm:px-8">
          {tab === 'overview' && <OverviewTab job={job} resumes={resumes} edit={edit} notify={notify} />}
          {tab === 'timeline' && <TimelineTab job={job} edit={edit} />}
          {tab === 'contacts' && <ContactsTab job={job} edit={edit} />}
          {tab === 'notes' && (
            <TextArea
              label="Private notes"
              rows={12}
              value={job.notes ?? ''}
              onChange={(e) => edit({ notes: e.target.value }, TYPING)}
              placeholder="Interview prep, questions to ask, things to remember…"
            />
          )}
        </div>
      </div>
    </div>
  )
}

// Inline form for adding the posting / application link after the fact.
function AddLinkForm({ onSave, onCancel }) {
  const [url, setUrl] = useState('')
  const submit = (e) => {
    e.preventDefault()
    if (url.trim()) onSave(normalizeUrl(url))
  }
  return (
    <form onSubmit={submit} noValidate className="border-b border-line bg-white px-5 py-4 sm:px-8">
      <label htmlFor="job-link-input" className="block text-xs font-medium text-ink-2">
        Link to the job posting or the page where you applied
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        <input
          id="job-link-input"
          type="text"
          inputMode="url"
          autoComplete="url"
          autoFocus
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && (e.stopPropagation(), onCancel())}
          placeholder="https://…"
          className="h-10 min-w-0 flex-[1_1_240px] rounded-xl border border-line bg-white px-3.5 text-sm transition outline-none focus:border-ink focus:ring-4 focus:ring-accent/15"
        />
        <Button type="submit" disabled={!url.trim()}>
          Save link
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

function StageBar({ job, onMove }) {
  const rejected = job.stage === 'rejected'
  const current = PIPELINE.findIndex((s) => s.id === job.stage)
  return (
    <div>
      <div className="flex gap-1.5" role="radiogroup" aria-label="Stage">
        {PIPELINE.map((s, i) => {
          const done = !rejected && i < current
          const active = !rejected && i === current
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onMove(s.id)}
              className="group flex flex-1 flex-col items-start gap-2 text-left"
            >
              <span
                className={cx(
                  'block h-1.5 w-full rounded transition-colors duration-500',
                  active ? 'bg-accent' : done ? 'bg-ink' : 'bg-line group-hover:bg-line-strong',
                )}
              />
              <span className={cx('text-[13px]', active ? 'font-semibold text-ink' : done ? 'text-ink' : 'text-muted')}>
                {s.name}
              </span>
            </button>
          )
        })}
      </div>
      {rejected ? (
        <p className="mt-3 flex items-center gap-2 text-[13px] text-ink-2">
          <StagePill stage="rejected" /> This application is closed.
        </p>
      ) : (
        <button
          type="button"
          onClick={() => onMove('rejected')}
          className="mt-2.5 text-[13px] text-muted underline underline-offset-[3px] transition-colors hover:text-ink"
        >
          Mark as rejected or withdrawn
        </button>
      )}
    </div>
  )
}

function NextStep({ job, edit, notify }) {
  const [date, time] = splitDateTime(job.next_step_at)
  const setWhen = (d, t) => edit({ next_step_at: combineDateTime(d, t) })

  const addToCalendar = () => {
    const ics = buildIcs({
      id: `${job.id}-${job.next_step_at}`,
      title: `${job.next_step || 'Next step'} · ${job.company}`,
      description: `${job.role} at ${job.company}`,
      start: job.next_step_at,
      allDay: !hasTime(job.next_step_at),
    })
    downloadIcs(`${job.company}-${date}.ics`.replace(/\s+/g, '-').toLowerCase(), ics)
  }

  const markDone = () => {
    edit({
      next_step: '',
      next_step_at: null,
      events: [...(job.events ?? []), makeEvent(`Done: ${job.next_step || 'Next step'}`, { type: 'step' })],
    })
    notify('Step completed and added to the timeline')
  }

  return (
    <section aria-label="Next step" className="rounded-[18px] bg-accent-soft p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="eyebrow text-[#7a2a0b]">Next step</span>
        {job.next_step_at && <span className="text-[13px] font-medium text-[#5c2209]">{formatNextStep(job)}</span>}
      </div>
      <div className="mt-3 grid gap-2.5 sm:grid-cols-[1fr_auto_auto]">
        <label>
          <span className="sr-only">What happens next</span>
          <input
            className="w-full rounded-xl border border-transparent bg-white/80 px-3.5 py-2.5 text-sm outline-none focus:border-ink focus:bg-white"
            value={job.next_step ?? ''}
            onChange={(e) => edit({ next_step: e.target.value }, TYPING)}
            placeholder="e.g. Technical round, follow up…"
          />
        </label>
        <label>
          <span className="sr-only">Date</span>
          <input
            type="date"
            className="w-full rounded-xl border border-transparent bg-white/80 px-3 py-2.5 text-sm outline-none focus:border-ink focus:bg-white"
            value={date}
            onChange={(e) => setWhen(e.target.value, time)}
          />
        </label>
        <label>
          <span className="sr-only">Time (optional)</span>
          <input
            type="time"
            className="w-full rounded-xl border border-transparent bg-white/80 px-3 py-2.5 text-sm outline-none focus:border-ink focus:bg-white disabled:opacity-50"
            value={time}
            disabled={!date}
            onChange={(e) => setWhen(date, e.target.value)}
          />
        </label>
      </div>
      {(job.next_step || job.next_step_at) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {job.next_step_at && (
            <Button size="sm" onClick={addToCalendar}>
              <CalendarPlus className="size-4" /> Add to calendar
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={markDone}>
            <Check className="size-4" /> Mark done
          </Button>
        </div>
      )}
    </section>
  )
}

function OverviewTab({ job, resumes, edit, notify }) {
  // Kept locally while typing so "18–" isn't reformatted mid-entry.
  const [salary, setSalary] = useState(salaryRangeText(job))
  const resume = resumes.find((r) => r.id === job.resume_id)

  const chooseResume = (id) => {
    const picked = resumes.find((r) => r.id === id)
    edit({ resume_id: picked?.id ?? null, resume_snapshot: snapshotOf(picked) })
  }

  return (
    <div className="flex flex-col gap-7">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput label="Role" value={job.role} onChange={(e) => edit({ role: e.target.value }, TYPING)} />
        <TextInput label="Company" value={job.company} onChange={(e) => edit({ company: e.target.value }, TYPING)} />
        <TextInput
          label="Job link"
          type="url"
          className="sm:col-span-2"
          value={job.url ?? ''}
          onChange={(e) => edit({ url: e.target.value }, TYPING)}
          placeholder="https://…"
        />
        <TextInput
          label="Location"
          value={job.location ?? ''}
          onChange={(e) => edit({ location: e.target.value }, TYPING)}
        />
        <div>
          <span className="mb-1.5 block text-xs font-medium text-ink-2">Work mode</span>
          <Segmented value={job.work_mode} onChange={(v) => edit({ work_mode: v })} options={WORK_MODES} />
        </div>
        <TextInput
          label="Salary range (₹ LPA)"
          value={salary}
          inputMode="decimal"
          placeholder="e.g. 18–24"
          onChange={(e) => {
            setSalary(e.target.value)
            const [salary_min, salary_max] = parseSalaryRange(e.target.value)
            edit({ salary_min, salary_max }, TYPING)
          }}
        />
        <TextInput
          label="Your expectation (₹ LPA)"
          type="number"
          min="0"
          step="0.5"
          value={job.salary_expected ?? ''}
          onChange={(e) => edit({ salary_expected: e.target.value === '' ? null : Number(e.target.value) }, TYPING)}
        />
        <TextInput
          label="Applied on"
          type="date"
          value={job.applied_on ?? ''}
          onChange={(e) => edit({ applied_on: e.target.value || null })}
        />
        <Select
          label="Source"
          value={job.source ?? ''}
          onChange={(e) => edit({ source: e.target.value })}
          options={SOURCES}
        />
        {job.source === 'referral' && (
          <TextInput
            label="Referred by"
            className="sm:col-span-2"
            value={job.referrer ?? ''}
            onChange={(e) => edit({ referrer: e.target.value }, TYPING)}
          />
        )}
      </div>

      <section aria-label="Resume sent" className="rounded-[18px] border border-line bg-white p-4">
        <div className="flex gap-4">
          {job.resume_snapshot ? (
            <div className="w-16 flex-none overflow-hidden rounded-[3px] shadow-[0_0_0_1px_var(--color-line),0_8px_18px_-10px_rgb(18_18_17/0.35)]">
              <ResumeThumbnail
                data={job.resume_snapshot.data}
                style={{ ...DEFAULT_STYLE, ...job.resume_snapshot.style }}
              />
            </div>
          ) : (
            <div className="flex aspect-[210/297] w-16 flex-none items-center justify-center rounded-[3px] border border-dashed border-line-strong text-[10px] text-muted">
              None
            </div>
          )}
          <div className="min-w-0 flex-1">
            <span className="eyebrow">Resume sent</span>
            <Select
              className="mt-1.5"
              aria-label="Resume sent"
              value={job.resume_id ?? ''}
              onChange={(e) => chooseResume(e.target.value)}
              options={[['', resumes.length ? 'None' : 'No resumes yet'], ...resumes.map((r) => [r.id, r.title])]}
            />
            {job.resume_snapshot && (
              <p className="mt-2 text-xs text-muted">
                Copy saved {formatDate(job.resume_snapshot.at)}. Later edits to the resume don&apos;t change it.
              </p>
            )}
            {resume && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  to={`/app/resume/${resume.id}`}
                  className="inline-flex h-8 items-center rounded-full px-3.5 text-[13px] ring-1 ring-line transition ring-inset hover:ring-ink/40"
                >
                  Open resume
                </Link>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    edit({ resume_snapshot: snapshotOf(resume) })
                    notify('Saved copy updated to the current resume')
                  }}
                >
                  <RefreshCw className="size-3.5" /> Update saved copy
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      <TextArea
        label="Job description"
        rows={8}
        value={job.description ?? ''}
        onChange={(e) => edit({ description: e.target.value }, TYPING)}
        placeholder="Paste the description so you still have it after the posting closes"
      />
    </div>
  )
}

function TimelineTab({ job, edit }) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(todayISO())
  const events = [...(job.events ?? [])].sort((a, b) => b.at.localeCompare(a.at))

  const add = (e) => {
    e.preventDefault()
    if (!title.trim()) return
    edit({
      events: [
        ...(job.events ?? []),
        makeEvent(title.trim(), { at: combineDateTime(date, '') ?? new Date().toISOString() }),
      ],
    })
    setTitle('')
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={add}
        className="grid gap-2.5 rounded-[18px] border border-line bg-white p-4 sm:grid-cols-[1fr_auto_auto] sm:items-end"
      >
        <TextInput
          label="Log an event"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Recruiter call"
        />
        <TextInput label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Button type="submit" disabled={!title.trim()}>
          Add
        </Button>
      </form>
      <ol className="flex flex-col">
        {events.map((ev, i) => (
          <li key={ev.id} className="flex gap-4">
            <div className="flex w-3.5 flex-none flex-col items-center">
              <span
                className={cx(
                  'mt-1 size-3 rounded-full ring-[3px] ring-paper',
                  ev.type === 'stage' ? 'bg-ink' : 'bg-accent',
                )}
              />
              {i < events.length - 1 && <span className="my-1 w-px flex-1 bg-line" />}
            </div>
            <div className="flex flex-1 items-start justify-between gap-3 pb-5">
              <div>
                <div className="eyebrow">{formatDate(ev.at)}</div>
                <div className="mt-0.5 text-[15px] font-semibold">{ev.title}</div>
                {ev.detail && <div className="mt-0.5 text-sm text-ink-2">{ev.detail}</div>}
              </div>
              {ev.type !== 'stage' && (
                <IconButton
                  label={`Remove "${ev.title}"`}
                  onClick={() => edit({ events: job.events.filter((x) => x.id !== ev.id) })}
                  className="hover:text-red-600"
                >
                  <X className="size-4" />
                </IconButton>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

const EMPTY_CONTACT = { name: '', role: '', email: '', link: '' }

function ContactsTab({ job, edit }) {
  const [draft, setDraft] = useState(EMPTY_CONTACT)
  const contacts = job.contacts ?? []
  const set = (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.value }))

  const add = (e) => {
    e.preventDefault()
    if (!draft.name.trim()) return
    edit({ contacts: [...contacts, { id: uid(), ...draft, name: draft.name.trim() }] })
    setDraft(EMPTY_CONTACT)
  }

  return (
    <div className="flex flex-col gap-4">
      {contacts.length === 0 && (
        <p className="text-sm text-muted">Recruiters, interviewers and the person who referred you.</p>
      )}
      <ul className="flex flex-col gap-3">
        {contacts.map((c) => (
          <li key={c.id} className="flex items-center gap-3.5 rounded-[18px] border border-line bg-white p-4">
            <span
              className="flex size-11 flex-none items-center justify-center rounded-full bg-paper-2 font-semibold"
              aria-hidden="true"
            >
              {c.name
                .split(/\s+/)
                .map((p) => p[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-semibold">{c.name}</div>
              {c.role && <div className="truncate text-[13px] text-muted">{c.role}</div>}
            </div>
            {c.email && (
              <a
                href={`mailto:${c.email}`}
                aria-label={`Email ${c.name}`}
                className="flex size-9 items-center justify-center rounded-full ring-1 ring-line ring-inset hover:ring-ink/40"
              >
                <Mail className="size-4" />
              </a>
            )}
            {c.link && (
              <a
                href={hrefFor(c.link, 'url')}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open profile of ${c.name}`}
                className="flex size-9 items-center justify-center rounded-full ring-1 ring-line ring-inset hover:ring-ink/40"
              >
                <ExternalLink className="size-4" />
              </a>
            )}
            <IconButton
              label={`Remove ${c.name}`}
              className="hover:text-red-600"
              onClick={() => edit({ contacts: contacts.filter((x) => x.id !== c.id) })}
            >
              <X className="size-4" />
            </IconButton>
          </li>
        ))}
      </ul>
      <form
        onSubmit={add}
        className="grid gap-3 rounded-[18px] border border-dashed border-line-strong p-4 sm:grid-cols-2"
      >
        <TextInput label="Name" value={draft.name} onChange={set('name')} />
        <TextInput label="Role" value={draft.role} onChange={set('role')} placeholder="e.g. Recruiter" />
        <TextInput label="Email" type="email" value={draft.email} onChange={set('email')} />
        <TextInput label="Profile link" value={draft.link} onChange={set('link')} placeholder="linkedin.com/in/…" />
        <div className="sm:col-span-2">
          <Button type="submit" variant="secondary" disabled={!draft.name.trim()}>
            Add contact
          </Button>
        </div>
      </form>
    </div>
  )
}
