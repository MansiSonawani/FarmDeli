import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Copy, FileText, Globe, LogOut, MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import ResumeThumbnail from '../components/resume/ResumeThumbnail'
import { Button, Modal, Spinner, TextInput, cx, useToast } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { DEFAULT_STYLE, emptyResume, sampleResume } from '../lib/defaults'
import { timeAgo } from '../lib/format'
import { createResume, deleteResume, duplicateResume, listResumes, updateResume } from '../lib/store'
import { isLocalMode } from '../lib/supabase'
import { templateStyle } from '../lib/templates'
import Logo from '../components/Logo'

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [resumes, setResumes] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [renaming, setRenaming] = useState(null)
  const [toastNode, notify] = useToast()

  const load = () =>
    listResumes()
      .then(setResumes)
      .catch((e) => {
        setResumes([])
        notify(e.message, 'error')
      })

  useEffect(() => {
    document.title = 'My resumes – CV Builder'
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (fn, success) => {
    try {
      await fn()
      if (success) notify(success)
      await load()
    } catch (e) {
      notify(e.message, 'error')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:inline">{isLocalMode ? 'Demo mode' : user?.email}</span>
            {!isLocalMode && (
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="size-4" /> Sign out
              </Button>
            )}
          </div>
        </div>
      </header>

      {isLocalMode && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-800">
          Demo mode: resumes are saved in this browser only. Add your Supabase keys to <code className="rounded bg-amber-100 px-1">.env</code> to enable accounts and cloud sync.
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My resumes</h1>
            <p className="text-sm text-slate-500">Create, edit and download your resumes.</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" /> New resume
          </Button>
        </div>

        {!resumes ? (
          <div className="flex justify-center py-20">
            <Spinner />
          </div>
        ) : resumes.length === 0 ? (
          <EmptyState onCreate={() => setCreateOpen(true)} />
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {resumes.map((resume) => (
              <ResumeCard
                key={resume.id}
                resume={resume}
                onRename={() => setRenaming(resume)}
                onDuplicate={() => run(() => duplicateResume(resume), 'Resume duplicated')}
                onDelete={() => {
                  if (confirm(`Delete "${resume.title}"? This cannot be undone.`)) run(() => deleteResume(resume.id), 'Resume deleted')
                }}
              />
            ))}
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="flex aspect-[210/297] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 transition hover:border-indigo-400 hover:text-indigo-600"
            >
              <Plus className="size-6" />
              <span className="text-sm font-medium">New resume</span>
            </button>
          </div>
        )}
      </main>

      <CreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={async ({ title, example }) => {
          try {
            const row = await createResume({
              title,
              data: example ? sampleResume() : emptyResume(isLocalMode ? '' : user?.email),
              style: templateStyle(example ? 'modern' : 'classic'),
            })
            navigate(`/app/resume/${row.id}`)
          } catch (e) {
            notify(e.message, 'error')
          }
        }}
      />

      <RenameDialog
        resume={renaming}
        onClose={() => setRenaming(null)}
        onSave={(title) => {
          const target = renaming
          setRenaming(null)
          run(() => updateResume(target.id, { title }))
        }}
      />
      {toastNode}
    </div>
  )
}

function EmptyState({ onCreate }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
        <FileText className="size-7" />
      </div>
      <h2 className="text-lg font-semibold text-slate-900">No resumes yet</h2>
      <p className="mt-1 max-w-sm text-sm text-slate-500">Start from scratch or from example content, then make it yours.</p>
      <Button className="mt-6" onClick={onCreate}>
        <Plus className="size-4" /> Create your first resume
      </Button>
    </div>
  )
}

function ResumeCard({ resume, onRename, onDuplicate, onDelete }) {
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
      <Link to={`/app/resume/${resume.id}`} className="block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition group-hover:-translate-y-0.5 group-hover:shadow-md">
        <ResumeThumbnail data={resume.data} style={style} />
      </Link>
      <div className="mt-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-800">{resume.title}</div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            Edited {timeAgo(resume.updated_at)}
            {resume.is_public && (
              <span className="inline-flex items-center gap-0.5 text-emerald-600">
                <Globe className="size-3" /> Public
              </span>
            )}
          </div>
        </div>
        <div className="relative">
          <button
            type="button"
            aria-label="Resume actions"
            onClick={(e) => {
              e.stopPropagation()
              setMenu((m) => !m)
            }}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
          >
            <MoreVertical className="size-4" />
          </button>
          {menu && (
            <div className="absolute right-0 z-10 mt-1 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              <MenuItem icon={Pencil} onClick={onRename}>
                Rename
              </MenuItem>
              <MenuItem icon={Copy} onClick={onDuplicate}>
                Duplicate
              </MenuItem>
              <MenuItem icon={Trash2} onClick={onDelete} danger>
                Delete
              </MenuItem>
            </div>
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
      className={cx('flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50', danger ? 'text-red-600' : 'text-slate-700')}
    >
      <Icon className="size-4" />
      {children}
    </button>
  )
}

function CreateDialog({ open, onClose, onCreate }) {
  const [title, setTitle] = useState('')
  const [example, setExample] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setTitle('')
      setExample(false)
      setBusy(false)
    }
  }, [open])

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    await onCreate({ title: title.trim() || 'Untitled resume', example })
    setBusy(false)
  }

  return (
    <Modal open={open} onClose={onClose} title="New resume">
      <form onSubmit={submit} className="space-y-4">
        <TextInput label="Name" placeholder="e.g. Product Designer – 2026" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        <div className="grid grid-cols-2 gap-3">
          {[
            [false, 'Start blank', 'Empty sections ready to fill in'],
            [true, 'Use an example', 'Pre-filled content to edit'],
          ].map(([value, name, text]) => (
            <button
              key={name}
              type="button"
              onClick={() => setExample(value)}
              className={cx('rounded-xl border-2 p-3 text-left transition', example === value ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-200 hover:border-slate-300')}
            >
              <div className="text-sm font-semibold text-slate-800">{name}</div>
              <div className="mt-0.5 text-xs text-slate-500">{text}</div>
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            Create resume
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function RenameDialog({ resume, onClose, onSave }) {
  const [title, setTitle] = useState('')
  useEffect(() => {
    if (resume) setTitle(resume.title)
  }, [resume])

  return (
    <Modal open={Boolean(resume)} onClose={onClose} title="Rename resume">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSave(title.trim() || 'Untitled resume')
        }}
        className="space-y-4"
      >
        <TextInput label="Name" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Modal>
  )
}
