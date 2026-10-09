import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import AppHeader from '../components/AppHeader'
import DemoBanner from '../components/DemoBanner'
import MaskedLines from '../components/motion/MaskedLines'
import PageTransition from '../components/motion/PageTransition'
import JobBoard from '../components/jobs/JobBoard'
import JobDetail from '../components/jobs/JobDetail'
import JobForm from '../components/jobs/JobForm'
import JobTable from '../components/jobs/JobTable'
import MobileJobList from '../components/jobs/MobileJobList'
import Overview from '../components/jobs/Overview'
import Drawer from '../components/ui/Drawer'
import { Button, Eyebrow, Modal, Segmented, Spinner } from '../components/ui'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useJobs } from '../hooks/useJobs'
import { useToast } from '../hooks/useToast'
import { cx } from '../lib/cx'
import { FILTERS, filterJobs, sampleJobs, upcomingSteps } from '../lib/jobs'
import { listResumes } from '../lib/store'

export default function Jobs() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const notify = useToast()
  const { jobs, create, update, move, remove } = useJobs()
  const [resumes, setResumes] = useState([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [view, setView] = useState('board')
  const [addStage, setAddStage] = useState(null) // stage to preselect; null = form closed
  useDocumentTitle('Job tracker')

  useEffect(() => {
    listResumes()
      .then(setResumes)
      .catch(() => setResumes([]))
  }, [])

  const visible = useMemo(() => filterJobs(jobs ?? [], { query, filter }), [jobs, query, filter])
  const upcoming = useMemo(() => upcomingSteps(jobs ?? []), [jobs])
  const selected = jobs?.find((j) => j.id === jobId)
  const closeDetail = useCallback(() => navigate('/app/jobs'), [navigate])

  // A link to a job that no longer exists falls back to the board.
  useEffect(() => {
    if (jobs && jobId && !selected) navigate('/app/jobs', { replace: true })
  }, [jobs, jobId, selected, navigate])

  const addJob = async (values) => {
    const row = await create(values)
    setAddStage(null)
    notify(`${row.role} at ${row.company} added`)
  }

  const addExamples = async () => {
    for (const values of sampleJobs()) await create(values)
    notify('Example jobs added')
  }

  const deleteSelected = async (id) => {
    closeDetail()
    await remove(id)
    notify('Job deleted')
  }

  return (
    <div className="min-h-dvh bg-paper">
      <AppHeader />
      <DemoBanner what="your jobs are" />

      <PageTransition>
        <main className="mx-auto max-w-7xl px-5 pt-12 pb-28 sm:px-8 sm:pt-16">
          <div className="flex flex-col gap-6 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Eyebrow index={jobs ? String(jobs.length).padStart(2, '0') : '··'}>Job tracker</Eyebrow>
              <MaskedLines
                as="h1"
                trigger="mount"
                className="mt-4 text-[clamp(2.6rem,7vw,5rem)] leading-[0.92] font-medium tracking-[-0.05em]"
                lines={[
                  <>
                    Your <span className="font-serif font-normal italic">applications</span>
                  </>,
                ]}
              />
            </div>
            <Button
              size="lg"
              onClick={() => setAddStage('wishlist')}
              className="group hidden self-start sm:inline-flex sm:self-auto"
            >
              <Plus className="size-4 transition-transform duration-500 group-hover:rotate-90" /> Add a job
            </Button>
          </div>

          {!jobs ? (
            <div className="flex justify-center py-24">
              <Spinner />
            </div>
          ) : jobs.length === 0 ? (
            <EmptyState onAdd={() => setAddStage('wishlist')} onExamples={addExamples} />
          ) : (
            <>
              <Overview jobs={jobs} upcoming={upcoming} />

              <div className="flex flex-wrap items-center gap-3 pb-6">
                <label className="relative flex min-w-0 flex-[1_1_240px] items-center sm:flex-[0_1_320px]">
                  <span className="sr-only">Search applications</span>
                  <Search className="pointer-events-none absolute left-3.5 size-4 text-muted" aria-hidden="true" />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search company or role"
                    className="h-10 w-full rounded-full border border-line bg-white pr-4 pl-10 text-sm transition outline-none hover:border-line-strong focus:border-ink focus:ring-4 focus:ring-accent/15"
                  />
                </label>
                <div role="group" aria-label="Filters" className="flex flex-wrap gap-2">
                  {FILTERS.map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={filter === id}
                      onClick={() => setFilter(id)}
                      className={cx(
                        'h-10 rounded-full border px-4 text-sm transition-colors',
                        filter === id
                          ? 'border-ink bg-ink text-paper'
                          : 'border-line bg-white text-ink-2 hover:border-line-strong',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="ml-auto hidden w-44 md:block">
                  <Segmented
                    value={view}
                    onChange={setView}
                    options={[
                      ['board', 'Board'],
                      ['list', 'List'],
                    ]}
                  />
                </div>
              </div>

              <div className="hidden md:block">
                {view === 'board' ? (
                  <JobBoard jobs={visible} onMove={move} onAdd={setAddStage} />
                ) : visible.length ? (
                  <JobTable jobs={visible} />
                ) : (
                  <NoMatches />
                )}
              </div>
              <div className="md:hidden">
                <MobileJobList jobs={visible} />
              </div>
            </>
          )}
        </main>
      </PageTransition>

      {/* Mobile: floating add button */}
      <button
        type="button"
        onClick={() => setAddStage('wishlist')}
        aria-label="Add a job"
        className="fixed right-5 bottom-6 z-30 flex size-14 items-center justify-center rounded-full bg-accent text-ink shadow-[0_12px_24px_-8px_rgb(255_90_31/0.6)] transition-transform active:scale-95 sm:hidden"
      >
        <Plus className="size-6" />
      </button>

      <Modal open={addStage !== null} onClose={() => setAddStage(null)} title="Add a job" size="lg">
        {addStage !== null && (
          <JobForm initialStage={addStage} resumes={resumes} onSubmit={addJob} onCancel={() => setAddStage(null)} />
        )}
      </Modal>

      <Drawer
        open={Boolean(selected)}
        onClose={closeDetail}
        label={selected ? `${selected.role} at ${selected.company}` : 'Job'}
      >
        {selected && (
          <JobDetail
            key={selected.id}
            job={selected}
            resumes={resumes}
            onUpdate={update}
            onMove={move}
            onDelete={deleteSelected}
            onClose={closeDetail}
            notify={notify}
            startAddingLink={Boolean(location.state?.addLink)}
          />
        )}
      </Drawer>
    </div>
  )
}

function EmptyState({ onAdd, onExamples }) {
  return (
    <div className="flex flex-col items-start py-20">
      <p className="max-w-lg font-serif text-4xl leading-tight text-ink italic">
        Every offer starts as a wishlist. Add the first job you&apos;re eyeing.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button size="lg" onClick={onAdd}>
          <Plus className="size-4" /> Add a job
        </Button>
        <Button size="lg" variant="secondary" onClick={onExamples}>
          Try with example jobs
        </Button>
      </div>
    </div>
  )
}

function NoMatches() {
  return (
    <p className="rounded-[20px] border border-dashed border-line-strong px-6 py-12 text-center text-sm text-muted">
      No applications match your search or filter.
    </p>
  )
}
