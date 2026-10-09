import { useState } from 'react'
import { Button, Segmented, Select, TextArea, TextInput } from '../ui'
import { StageDot } from './JobBits'
import {
  SOURCES,
  STAGES,
  WORK_MODES,
  combineDateTime,
  normalizeUrl,
  parseSalaryRange,
  snapshotOf,
  todayISO,
} from '../../lib/jobs'
import { cx } from '../../lib/cx'

// The "Add a job" form. Only role and company are required; everything else
// can be filled in later from the job's detail panel.
export default function JobForm({ initialStage = 'wishlist', resumes, onSubmit, onCancel }) {
  const [values, setValues] = useState({
    role: '',
    company: '',
    url: '',
    location: '',
    work_mode: 'hybrid',
    stage: initialStage,
    applied_on: initialStage === 'wishlist' ? '' : todayISO(),
    salary: '',
    source: '',
    referrer: '',
    resume_id: '',
    description: '',
    next_step: '',
    next_date: '',
    next_time: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e?.target ? e.target.value : e }))

  const setStage = (stage) =>
    setValues((v) => ({ ...v, stage, applied_on: stage !== 'wishlist' && !v.applied_on ? todayISO() : v.applied_on }))

  const submit = async (e) => {
    e.preventDefault()
    if (!values.role.trim() || !values.company.trim()) {
      setError('Add the role and the company.')
      return
    }
    setBusy(true)
    setError('')
    const [salary_min, salary_max] = parseSalaryRange(values.salary)
    const resume = resumes.find((r) => r.id === values.resume_id)
    try {
      await onSubmit({
        role: values.role.trim(),
        company: values.company.trim(),
        url: normalizeUrl(values.url),
        location: values.location.trim(),
        work_mode: values.work_mode,
        stage: values.stage,
        applied_on: values.applied_on || null,
        salary_min,
        salary_max,
        source: values.source,
        referrer: values.source === 'referral' ? values.referrer.trim() : '',
        resume_id: resume?.id ?? null,
        resume_snapshot: snapshotOf(resume),
        description: values.description,
        next_step: values.next_step.trim(),
        next_step_at: combineDateTime(values.next_date, values.next_time),
      })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput
          label="Role *"
          required
          autoFocus
          value={values.role}
          onChange={set('role')}
          placeholder="Frontend Engineer"
        />
        <TextInput
          label="Company *"
          required
          value={values.company}
          onChange={set('company')}
          placeholder="Company name"
        />
        <TextInput
          label="Job link"
          type="url"
          className="sm:col-span-2"
          value={values.url}
          onChange={set('url')}
          placeholder="https://…"
        />
        <TextInput label="Location" value={values.location} onChange={set('location')} placeholder="City" />
        <div>
          <span className="mb-1.5 block text-xs font-medium text-ink-2">Work mode</span>
          <Segmented value={values.work_mode} onChange={set('work_mode')} options={WORK_MODES} />
        </div>
      </div>

      <fieldset>
        <legend className="mb-2 text-xs font-medium text-ink-2">Stage</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Stage">
          {STAGES.map((s) => (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={values.stage === s.id}
              onClick={() => setStage(s.id)}
              className={cx(
                'inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-[13px] transition-colors',
                values.stage === s.id
                  ? 'border-ink bg-ink text-paper'
                  : 'border-line bg-white text-ink-2 hover:border-line-strong',
              )}
            >
              <StageDot stage={s.id} />
              {s.name}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-3">
        <TextInput label="Date applied" type="date" value={values.applied_on} onChange={set('applied_on')} />
        <TextInput
          label="Salary (₹ LPA)"
          value={values.salary}
          onChange={set('salary')}
          placeholder="e.g. 18–24"
          inputMode="decimal"
        />
        <Select label="Source" value={values.source} onChange={set('source')} options={SOURCES} />
        {values.source === 'referral' && (
          <TextInput
            label="Referred by"
            className="sm:col-span-3"
            value={values.referrer}
            onChange={set('referrer')}
            placeholder="Name"
          />
        )}
      </div>

      <Select
        label="Resume used"
        value={values.resume_id}
        onChange={set('resume_id')}
        options={[['', resumes.length ? 'None' : 'No resumes yet'], ...resumes.map((r) => [r.id, r.title])]}
        hint="A copy is kept, so you can always see exactly what you sent."
      />

      <TextArea
        label="Job description"
        rows={4}
        value={values.description}
        onChange={set('description')}
        placeholder="Paste it here so you still have it after the posting closes"
      />

      <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto]">
        <TextInput
          label="Next step"
          value={values.next_step}
          onChange={set('next_step')}
          placeholder="e.g. Follow up with recruiter"
        />
        <TextInput label="Date" type="date" value={values.next_date} onChange={set('next_date')} />
        <TextInput label="Time (optional)" type="time" value={values.next_time} onChange={set('next_time')} />
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 border-t border-line pt-5">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={busy}>
          Save job
        </Button>
      </div>
    </form>
  )
}
