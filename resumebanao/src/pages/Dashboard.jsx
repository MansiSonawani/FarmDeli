import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowUpRight, Copy, FileUp, Globe, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import AppHeader from '../components/AppHeader'
import DemoBanner from '../components/DemoBanner'
import MaskedLines from '../components/motion/MaskedLines'
import PageTransition from '../components/motion/PageTransition'
import ResumeThumbnail from '../components/resume/ResumeThumbnail'
import { Button, Eyebrow, Modal, Spinner, TextInput } from '../components/ui'
import { useAuth } from '../hooks/useAuth'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useToast } from '../hooks/useToast'
import { cx } from '../lib/cx'
import { DEFAULT_STYLE, emptyResume, sampleResume } from '../lib/defaults'
import { timeAgo } from '../lib/format'
import { EASE_OUT } from '../lib/motion'
import { IMPORT_ACCEPT, checkImportFile, fileTitle, importResumeFile } from '../lib/import'
import { createResume, deleteResume, duplicateResume, listResumes, updateResume } from '../lib/store'
import { isLocalMode } from '../lib/api'
import { templateStyle } from '../lib/templates'

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const notify = useToast()
  const [resumes, setResumes] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [renaming, setRenaming] = useState(null)
  useDocumentTitle('My resumes')

  const load = useCallback(
    () =>
      listResumes()
        .then(setResumes)
        .catch((e) => {
          setResumes([])
          notify(e.message, 'error')
        }),
    [notify],
  )

  useEffect(() => {
    load()
  }, [load])

  const run = async (fn, success) => {
    try {
      await fn()
      if (success) notify(success)
      await load()
    } catch (e) {
      notify(e.message, 'error')
    }
  }

  // Errors are thrown for the dialog to show next to the form.
  const create = async ({ title, example, file }) => {
    if (file) {
      const { data, warnings } = await importResumeFile(file)
      const row = await createResume({ title, data, style: templateStyle('classic') })
      navigate(`/app/resume/${row.id}`, { state: { imported: { fileName: file.name, warnings } } })
      return
    }
    const row = await createResume({
      title,
      data: example ? sampleResume() : emptyResume(isLocalMode ? '' : user?.email),
      style: templateStyle(example ? 'modern' : 'classic'),
    })
    navigate(`/app/resume/${row.id}`)
  }

  return (
    <div className="min-h-dvh bg-paper">
      <AppHeader />
      <DemoBanner what="resumes are" />

      <PageTransition>
        <main className="mx-auto max-w-7xl px-5 pt-14 pb-24 sm:px-8 sm:pt-20">
          <div className="flex flex-col gap-8 border-b border-line pb-10 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Eyebrow index={resumes ? String(resumes.length).padStart(2, '0') : '··'}>Dashboard</Eyebrow>
              <MaskedLines
                as="h1"
                trigger="mount"
                className="mt-4 text-[clamp(2.75rem,7vw,5.5rem)] leading-[0.92] font-medium tracking-[-0.05em]"
                lines={[
                  <>
                    Your <span className="font-serif font-normal italic">resumes</span>
                  </>,
                ]}
              />
            </div>
            <Button size="lg" onClick={() => setCreateOpen(true)} className="group self-start sm:self-auto">
              <Plus className="size-4 transition-transform duration-500 group-hover:rotate-90" /> New resume
            </Button>
          </div>

          {!resumes ? (
            <div className="flex justify-center py-24">
              <Spinner />
            </div>
          ) : resumes.length === 0 ? (
            <EmptyState onCreate={() => setCreateOpen(true)} />
          ) : (
            <motion.ul
              className="mt-12 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4"
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.06 } } }}
            >
              {resumes.map((resume, i) => (
                <motion.li
                  key={resume.id}
                  variants={{
                    hidden: { opacity: 0, y: 30 },
                    show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE_OUT } },
                  }}
                >
                  <ResumeCard
                    index={i}
                    resume={resume}
                    onRename={() => setRenaming(resume)}
                    onDuplicate={() => run(() => duplicateResume(resume), 'Resume duplicated')}
                    onDelete={() => {
                      if (confirm(`Delete "${resume.title}"? This cannot be undone.`))
                        run(() => deleteResume(resume.id), 'Resume deleted')
                    }}
                  />
                </motion.li>
              ))}
              <motion.li
                variants={{
                  hidden: { opacity: 0, y: 30 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE_OUT } },
                }}
              >
                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className="group flex aspect-[210/297] w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-line-strong text-muted transition-colors duration-500 hover:border-ink hover:text-ink"
                >
                  <span className="flex size-12 items-center justify-center rounded-full border border-current transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:rotate-90">
                    <Plus className="size-5" />
                  </span>
                  <span className="text-sm font-medium">New resume</span>
                </button>
              </motion.li>
            </motion.ul>
          )}
        </main>
      </PageTransition>

      <CreateDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreate={create} />
      <RenameDialog
        resume={renaming}
        onClose={() => setRenaming(null)}
        onSave={(title) => {
          const target = renaming
          setRenaming(null)
          run(() => updateResume(target.id, { title }))
        }}
      />
    </div>
  )
}

function EmptyState({ onCreate }) {
  return (
    <div className="flex flex-col items-start py-20">
      <p className="max-w-md font-serif text-4xl leading-tight text-ink italic">
        Nothing here yet — every great story starts with a blank page.
      </p>
      <Button size="lg" className="group mt-8" onClick={onCreate}>
        Create your first resume
        <ArrowUpRight className="size-4 transition-transform duration-500 group-hover:rotate-45" />
      </Button>
    </div>
  )
}

function ResumeCard({ index, resume, onRename, onDuplicate, onDelete }) {
  const [menu, setMenu] = useState(false)
  const style = { ...DEFAULT_STYLE, ...resume.style }

  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(false)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [menu])

  return (
    <div className="group relative">
      <Link
        to={`/app/resume/${resume.id}`}
        className="block overflow-hidden rounded-lg shadow-[0_1px_2px_rgb(18_18_17/0.06),0_20px_40px_-24px_rgb(18_18_17/0.3)] ring-1 ring-ink/5 transition-[transform,box-shadow] duration-700 ease-[var(--ease-out-expo)] group-hover:-translate-y-1.5 group-hover:-rotate-1 group-hover:shadow-[0_2px_4px_rgb(18_18_17/0.06),0_36px_60px_-24px_rgb(18_18_17/0.4)]"
        aria-label={`Open ${resume.title}`}
      >
        <ResumeThumbnail data={resume.data} style={style} />
      </Link>
      <div className="mt-4 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[11px] text-accent">{String(index + 1).padStart(2, '0')}</span>
            <span className="truncate font-medium text-ink">{resume.title}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-2 pl-6 text-xs text-muted">
            {timeAgo(resume.updated_at)}
            {resume.is_public && (
              <span className="inline-flex items-center gap-1 text-ink">
                <Globe className="size-3" /> Public
              </span>
            )}
          </div>
        </div>
        <div className="relative">
          <button
            type="button"
            aria-label={`Actions for ${resume.title}`}
            aria-expanded={menu}
            onClick={(e) => {
              e.stopPropagation()
              setMenu((m) => !m)
            }}
            className="rounded-full p-1.5 text-muted transition-colors hover:bg-paper-2 hover:text-ink"
          >
            <MoreHorizontal className="size-4" />
          </button>
          {menu && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.25, ease: EASE_OUT }}
              className="absolute right-0 z-10 mt-1 w-44 origin-top-right overflow-hidden rounded-2xl border border-line bg-white p-1 shadow-xl shadow-ink/10"
            >
              <MenuItem icon={Pencil} onClick={onRename}>
                Rename
              </MenuItem>
              <MenuItem icon={Copy} onClick={onDuplicate}>
                Duplicate
              </MenuItem>
              <MenuItem icon={Trash2} onClick={onDelete} danger>
                Delete
              </MenuItem>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}

function MenuItem({ icon: Icon, onClick, danger, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm hover:bg-paper',
        danger ? 'text-red-600' : 'text-ink',
      )}
    >
      <Icon className="size-4" />
      {children}
    </button>
  )
}

function CreateDialog({ open, onClose, onCreate }) {
  return (
    <Modal open={open} onClose={onClose} title="New resume">
      {/* Mounted fresh on every open, so the form always starts empty. */}
      {open && <CreateForm onClose={onClose} onCreate={onCreate} />}
    </Modal>
  )
}

function CreateForm({ onClose, onCreate }) {
  const canImport = !isLocalMode // importing needs the server
  const [title, setTitle] = useState('')
  const [start, setStart] = useState('blank') // blank | example | import
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const pickFile = (picked) => {
    if (!picked) return
    const problem = checkImportFile(picked)
    setError(problem ?? '')
    setFile(problem ? null : picked)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (start === 'import' && !file) {
      setError('Choose a PDF or Word file to import.')
      return
    }
    setError('')
    setBusy(true)
    try {
      await onCreate({
        title: title.trim() || (start === 'import' ? fileTitle(file) : 'Untitled resume'),
        example: start === 'example',
        file: start === 'import' ? file : null,
      })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  const options = [
    ['blank', 'Start blank', 'Empty sections, ready to fill'],
    ['example', 'Use an example', 'Pre-filled content to edit'],
  ]

  return (
    <form onSubmit={submit} className="space-y-5">
      <TextInput
        label="Name"
        placeholder={start === 'import' && file ? fileTitle(file) : 'e.g. Product Designer 2026'}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
      />
      <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Starting point">
        {options.map(([value, name, text]) => (
          <StartOption key={value} checked={start === value} onClick={() => setStart(value)} name={name} text={text} />
        ))}
        {canImport && (
          <StartOption
            className="col-span-2"
            checked={start === 'import'}
            onClick={() => setStart('import')}
            name="Import an existing resume"
            text="Upload a PDF or Word file and we'll fill in the details"
          />
        )}
      </div>
      {start === 'import' && <FileDrop file={file} onPick={pickFile} />}
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={busy}>
          {start === 'import' ? 'Import resume' : 'Create resume'}
        </Button>
      </div>
    </form>
  )
}

function StartOption({ checked, onClick, name, text, className }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onClick}
      className={cx(
        'rounded-2xl border p-4 text-left transition-colors duration-300',
        checked ? 'border-ink bg-white' : 'border-line hover:border-line-strong',
        className,
      )}
    >
      <div className="text-sm font-medium text-ink">{name}</div>
      <div className="mt-1 text-xs text-muted">{text}</div>
    </button>
  )
}

// A click-or-drop area for the file to import.
function FileDrop({ file, onPick }) {
  const [over, setOver] = useState(false)
  return (
    <label
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        onPick(e.dataTransfer.files?.[0])
      }}
      className={cx(
        'flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border border-dashed px-4 py-6 text-center transition-colors',
        over ? 'border-ink bg-white' : 'border-line-strong hover:border-ink/50',
      )}
    >
      <FileUp className="size-5 text-muted" aria-hidden="true" />
      <span className="text-sm font-medium text-ink">{file ? file.name : 'Choose a file or drop it here'}</span>
      <span className="text-xs text-muted">
        {file ? `${(file.size / 1024).toFixed(0)} KB · click to change` : 'PDF or Word (.docx), up to 5 MB'}
      </span>
      <input
        type="file"
        accept={IMPORT_ACCEPT}
        className="sr-only"
        aria-label="Resume file"
        onChange={(e) => {
          onPick(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </label>
  )
}

function RenameDialog({ resume, onClose, onSave }) {
  return (
    <Modal open={Boolean(resume)} onClose={onClose} title="Rename resume">
      {resume && <RenameForm key={resume.id} initial={resume.title} onClose={onClose} onSave={onSave} />}
    </Modal>
  )
}

function RenameForm({ initial, onClose, onSave }) {
  const [title, setTitle] = useState(initial)
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSave(title.trim() || 'Untitled resume')
      }}
      className="space-y-5"
    >
      <TextInput label="Name" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">Save</Button>
      </div>
    </form>
  )
}
