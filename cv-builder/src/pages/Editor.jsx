import { useCallback, useDeferredValue, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Copy, Download, ExternalLink, Eye, LoaderCircle, Palette, PenLine, Share2, TriangleAlert } from 'lucide-react'
import ContentPanel from '../components/editor/ContentPanel'
import CustomizePanel from '../components/editor/CustomizePanel'
import ResumePreview from '../components/resume/ResumePreview'
import { Button, FullPageSpinner, Modal, Toggle, cx, useToast } from '../components/ui'
import { DEFAULT_STYLE } from '../lib/defaults'
import { getResume, setSharing, updateResume } from '../lib/store'
import { isLocalMode } from '../lib/supabase'

const SAVE_DELAY = 800

export default function Editor() {
  const { id } = useParams()
  const [resume, setResume] = useState(null)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('content')
  const [mobileView, setMobileView] = useState('edit')
  const [saveState, setSaveState] = useState('saved') // saved | pending | saving | error
  const [pageCount, setPageCount] = useState(1)
  const [shareOpen, setShareOpen] = useState(false)
  const [toastNode, notify] = useToast()
  const dirty = useRef(false)

  useEffect(() => {
    getResume(id)
      .then((row) => setResume({ ...row, style: { ...DEFAULT_STYLE, ...row.style } }))
      .catch((e) => setError(e.message))
  }, [id])

  // Debounced autosave of title, content and style.
  useEffect(() => {
    if (!resume || !dirty.current) return
    setSaveState('pending')
    const timer = setTimeout(async () => {
      setSaveState('saving')
      try {
        await updateResume(resume.id, { title: resume.title, data: resume.data, style: resume.style })
        dirty.current = false
        setSaveState('saved')
      } catch (e) {
        setSaveState('error')
        notify(`Could not save: ${e.message}`, 'error')
      }
    }, SAVE_DELAY)
    return () => clearTimeout(timer)
  }, [resume?.title, resume?.data, resume?.style]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const warn = (e) => {
      if (dirty.current) e.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [])

  const updateData = useCallback((fn) => {
    dirty.current = true
    setResume((prev) => {
      const data = structuredClone(prev.data)
      fn(data)
      return { ...prev, data }
    })
  }, [])

  const setStyle = useCallback((fn) => {
    dirty.current = true
    setResume((prev) => ({ ...prev, style: fn(prev.style) }))
  }, [])

  const setTitle = (title) => {
    dirty.current = true
    setResume((prev) => ({ ...prev, title }))
  }

  // Rendering the preview is the expensive part; let typing stay responsive.
  const previewData = useDeferredValue(resume?.data)
  const previewStyle = useDeferredValue(resume?.style)

  useEffect(() => {
    if (resume?.title) document.title = `${resume.title} – CV Builder`
  }, [resume?.title])

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <TriangleAlert className="size-8 text-amber-500" />
        <p className="text-slate-600">{error}</p>
        <Link to="/app" className="text-sm font-medium text-indigo-600 hover:underline">
          Back to my resumes
        </Link>
      </div>
    )
  }
  if (!resume) return <FullPageSpinner />

  const download = () => {
    // The browser's "Save as PDF" produces a vector PDF with selectable text (ATS-friendly).
    const previous = document.title
    document.title = resume.data.personal.fullName ? `${resume.data.personal.fullName} – Resume` : resume.title
    window.print()
    document.title = previous
  }

  return (
    <div className="flex h-dvh flex-col bg-slate-100">
      <header className="flex h-14 flex-none items-center gap-2 border-b border-slate-200 bg-white px-3 sm:px-4">
        <Link to="/app" className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="Back to dashboard">
          <ArrowLeft className="size-5" />
        </Link>
        <input
          value={resume.title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Resume name"
          className="min-w-0 flex-1 truncate rounded-md px-2 py-1 font-semibold text-slate-800 outline-none hover:bg-slate-50 focus:bg-slate-50 sm:max-w-xs"
        />
        <SaveIndicator state={saveState} />
        <div className="ml-auto flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShareOpen(true)} aria-label="Share">
            <Share2 className="size-4" />
            <span className="hidden sm:inline">Share</span>
          </Button>
          <Button size="sm" onClick={download} aria-label="Download PDF">
            <Download className="size-4" />
            <span className="hidden sm:inline">Download PDF</span>
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className={cx('flex w-full min-w-0 flex-col border-r border-slate-200 bg-slate-50 lg:w-[460px] lg:flex-none xl:w-[520px]', mobileView === 'preview' && 'hidden lg:flex')}>
          <div className="flex flex-none gap-1 border-b border-slate-200 bg-white p-2">
            <TabButton active={tab === 'content'} onClick={() => setTab('content')} icon={<PenLine className="size-4" />}>
              Content
            </TabButton>
            <TabButton active={tab === 'customize'} onClick={() => setTab('customize')} icon={<Palette className="size-4" />}>
              Customize
            </TabButton>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3 pb-24 sm:p-4 lg:pb-4">
            {tab === 'content' ? (
              <ContentPanel data={resume.data} style={resume.style} updateData={updateData} notify={notify} />
            ) : (
              <CustomizePanel data={resume.data} style={resume.style} setStyle={setStyle} />
            )}
          </div>
        </aside>

        <main className={cx('min-w-0 flex-1 overflow-y-auto', mobileView === 'edit' && 'hidden lg:block')}>
          <div className="sticky top-0 z-10 flex justify-center py-2">
            <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-500 shadow-sm ring-1 ring-slate-200 backdrop-blur">
              {pageCount} {pageCount === 1 ? 'page' : 'pages'} · {resume.style.pageSize}
            </span>
          </div>
          <div className="px-2 pb-24 sm:px-6 lg:pb-10">
            <ResumePreview data={previewData ?? resume.data} style={previewStyle ?? resume.style} printable onPages={setPageCount} />
          </div>
        </main>
      </div>

      {/* Mobile: switch between editor and preview */}
      <div className="fixed bottom-4 left-1/2 z-20 flex -translate-x-1/2 rounded-full bg-slate-900 p-1 shadow-lg lg:hidden">
        <button
          type="button"
          onClick={() => setMobileView('edit')}
          className={cx('flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium', mobileView === 'edit' ? 'bg-white text-slate-900' : 'text-white')}
        >
          <PenLine className="size-4" /> Edit
        </button>
        <button
          type="button"
          onClick={() => setMobileView('preview')}
          className={cx('flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium', mobileView === 'preview' ? 'bg-white text-slate-900' : 'text-white')}
        >
          <Eye className="size-4" /> Preview
        </button>
      </div>

      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        resume={resume}
        onChange={(row) => setResume((prev) => ({ ...prev, is_public: row.is_public, slug: row.slug }))}
        notify={notify}
      />
      {toastNode}
    </div>
  )
}

function TabButton({ active, onClick, icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition',
        active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800',
      )}
    >
      {icon}
      {children}
    </button>
  )
}

function SaveIndicator({ state }) {
  const map = {
    saved: [<Check key="i" className="size-3.5" />, 'Saved'],
    pending: [<LoaderCircle key="i" className="size-3.5" />, 'Editing…'],
    saving: [<LoaderCircle key="i" className="size-3.5 animate-spin" />, 'Saving…'],
    error: [<TriangleAlert key="i" className="size-3.5" />, 'Not saved'],
  }
  const [icon, text] = map[state]
  return (
    <span className={cx('hidden items-center gap-1 text-xs sm:flex', state === 'error' ? 'text-red-600' : 'text-slate-400')}>
      {icon}
      {text}
    </span>
  )
}

function ShareDialog({ open, onClose, resume, onChange, notify }) {
  const [busy, setBusy] = useState(false)
  const url = resume.slug ? `${window.location.origin}/r/${resume.slug}` : ''

  const toggle = async (value) => {
    setBusy(true)
    try {
      onChange(await setSharing(resume, value))
    } catch (e) {
      notify(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    await navigator.clipboard.writeText(url)
    notify('Link copied')
  }

  return (
    <Modal open={open} onClose={onClose} title="Share your resume">
      <div className="space-y-4">
        <Toggle label={busy ? 'Updating…' : 'Public link'} checked={resume.is_public} onChange={toggle} />
        <p className="text-sm text-slate-500">
          Anyone with the link can view and download your resume. Turn it off at any time to make it private again.
        </p>
        {resume.is_public && url && (
          <div className="flex gap-2">
            <input readOnly value={url} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700" onFocus={(e) => e.target.select()} />
            <Button variant="secondary" size="md" onClick={copy} aria-label="Copy link">
              <Copy className="size-4" />
            </Button>
            <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-lg px-3 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50" aria-label="Open link">
              <ExternalLink className="size-4" />
            </a>
          </div>
        )}
        {isLocalMode && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700">Demo mode: public links only work in this browser until Supabase is connected.</p>}
      </div>
    </Modal>
  )
}
