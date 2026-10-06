import { useCallback, useDeferredValue, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  ExternalLink,
  Eye,
  LoaderCircle,
  Palette,
  PenLine,
  Share2,
  TriangleAlert,
  ZoomIn,
} from 'lucide-react'
import ContentPanel from '../components/editor/ContentPanel'
import ResumeLightbox, { ZoomTrigger } from '../components/editor/ResumeLightbox'
import ImportBanner from '../components/editor/ImportBanner'
import CustomizePanel from '../components/editor/CustomizePanel'
import ResumePreview from '../components/resume/ResumePreview'
import { Button, FullPageSpinner, Modal, Toggle } from '../components/ui'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useToast } from '../hooks/useToast'
import { cx } from '../lib/cx'
import { DEFAULT_STYLE } from '../lib/defaults'
import { EASE_OUT } from '../lib/motion'
import { getResume, setSharing, updateResume } from '../lib/store'
import { isLocalMode } from '../lib/api'

const SAVE_DELAY = 800

export default function Editor() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const notify = useToast()
  // Set by the dashboard after an import; kept in the history entry so a reload still shows it.
  const [importInfo, setImportInfo] = useState(location.state?.imported ?? null)
  const [resume, setResume] = useState(null)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('content')
  const [mobileView, setMobileView] = useState('edit')
  const [saveState, setSaveState] = useState('saved') // saved | pending | saving | error
  const [pageCount, setPageCount] = useState(1)
  const [shareOpen, setShareOpen] = useState(false)
  const [zoomOpen, setZoomOpen] = useState(false)
  const dirty = useRef(false)
  useDocumentTitle(resume?.title)

  useEffect(() => {
    getResume(id)
      .then((row) => setResume({ ...row, style: { ...DEFAULT_STYLE, ...row.style } }))
      .catch((e) => setError(e.message))
  }, [id])

  // Debounced autosave of title, content and style.
  const title = resume?.title
  const data = resume?.data
  const style = resume?.style
  const resumeId = resume?.id
  useEffect(() => {
    if (!resumeId || !dirty.current) return
    const timer = setTimeout(async () => {
      setSaveState('saving')
      try {
        await updateResume(resumeId, { title, data, style })
        dirty.current = false
        setSaveState('saved')
      } catch (e) {
        setSaveState('error')
        notify(`Could not save: ${e.message}`, 'error')
      }
    }, SAVE_DELAY)
    return () => clearTimeout(timer)
  }, [resumeId, title, data, style, notify])

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    const warn = (e) => {
      if (dirty.current) e.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [])

  const markDirty = useCallback(() => {
    dirty.current = true
    setSaveState('pending')
  }, [])

  const updateData = useCallback(
    (fn) => {
      markDirty()
      setResume((prev) => {
        const next = structuredClone(prev.data)
        fn(next)
        return { ...prev, data: next }
      })
    },
    [markDirty],
  )

  const setStyle = useCallback(
    (fn) => {
      markDirty()
      setResume((prev) => ({ ...prev, style: fn(prev.style) }))
    },
    [markDirty],
  )

  const setTitle = (value) => {
    markDirty()
    setResume((prev) => ({ ...prev, title: value }))
  }

  // Rendering the preview is the expensive part; keep typing responsive.
  const previewData = useDeferredValue(data)
  const previewStyle = useDeferredValue(style)

  if (error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <TriangleAlert className="size-8 text-accent" />
        <p className="text-ink-2">{error}</p>
        <Link to="/app" className="link-underline text-sm font-medium">
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
    <div className="flex h-dvh flex-col bg-paper">
      <header className="flex h-16 flex-none items-center gap-2 border-b border-line px-3 sm:px-5">
        <Link
          to="/app"
          className="rounded-full p-2 text-muted transition-colors hover:bg-paper-2 hover:text-ink"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <input
          value={resume.title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Resume name"
          className="min-w-0 flex-1 truncate rounded-full px-3 py-1.5 font-medium text-ink transition-colors outline-none hover:bg-paper-2 focus:bg-white focus:ring-1 focus:ring-line sm:max-w-xs"
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

      {importInfo && (
        <ImportBanner
          fileName={importInfo.fileName}
          warnings={importInfo.warnings}
          onDismiss={() => {
            setImportInfo(null)
            navigate(location.pathname, { replace: true, state: null })
          }}
        />
      )}

      <div className="flex min-h-0 flex-1">
        <aside
          className={cx(
            'flex w-full min-w-0 flex-col border-r border-line bg-paper lg:w-[460px] lg:flex-none xl:w-[520px]',
            mobileView === 'preview' && 'hidden lg:flex',
          )}
        >
          <div className="flex flex-none gap-6 border-b border-line px-5" role="tablist" aria-label="Editor panels">
            <TabButton
              active={tab === 'content'}
              onClick={() => setTab('content')}
              icon={<PenLine className="size-4" />}
            >
              Content
            </TabButton>
            <TabButton
              active={tab === 'customize'}
              onClick={() => setTab('customize')}
              icon={<Palette className="size-4" />}
            >
              Customize
            </TabButton>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3 pb-28 sm:p-5 lg:pb-6" role="tabpanel">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: EASE_OUT }}
            >
              {tab === 'content' ? (
                <ContentPanel data={resume.data} style={resume.style} updateData={updateData} notify={notify} />
              ) : (
                <CustomizePanel data={resume.data} style={resume.style} setStyle={setStyle} />
              )}
            </motion.div>
          </div>
        </aside>

        <main className={cx('canvas-dots min-w-0 flex-1 overflow-y-auto', mobileView === 'edit' && 'hidden lg:block')}>
          <div className="sticky top-0 z-10 flex items-center justify-center gap-2 py-3">
            <span className="eyebrow rounded-full bg-paper/90 px-3 py-1.5 shadow-sm ring-1 ring-line backdrop-blur">
              {pageCount} {pageCount === 1 ? 'page' : 'pages'} · {resume.style.pageSize}
            </span>
            {/* Also reachable without hovering, for touch screens and keyboards. */}
            <button
              type="button"
              onClick={() => setZoomOpen(true)}
              className="eyebrow inline-flex items-center gap-1.5 rounded-full bg-paper/90 px-3 py-1.5 shadow-sm ring-1 ring-line backdrop-blur transition-colors hover:text-ink"
            >
              <ZoomIn className="size-3.5" /> Full size
            </button>
          </div>
          <div className="px-2 pb-28 sm:px-8 lg:pb-12">
            <ZoomTrigger onOpen={() => setZoomOpen(true)}>
              <ResumePreview
                data={previewData ?? resume.data}
                style={previewStyle ?? resume.style}
                printable
                onPages={setPageCount}
              />
            </ZoomTrigger>
          </div>
        </main>
      </div>

      {/* Mobile: switch between editor and preview */}
      <div
        className="fixed bottom-5 left-1/2 z-20 flex -translate-x-1/2 rounded-full bg-ink p-1 shadow-xl shadow-ink/20 lg:hidden"
        role="group"
        aria-label="View"
      >
        {[
          ['edit', 'Edit', PenLine],
          ['preview', 'Preview', Eye],
        ].map(([value, label, Icon]) => (
          <button
            key={value}
            type="button"
            aria-pressed={mobileView === value}
            onClick={() => setMobileView(value)}
            className={cx(
              'relative flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors',
              mobileView === value ? 'text-ink' : 'text-paper',
            )}
          >
            {mobileView === value && (
              <motion.span
                layoutId="mobile-view"
                className="absolute inset-0 rounded-full bg-paper"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <Icon className="relative size-4" />
            <span className="relative">{label}</span>
          </button>
        ))}
      </div>

      <ResumeLightbox
        open={zoomOpen}
        onClose={() => setZoomOpen(false)}
        data={previewData ?? resume.data}
        style={previewStyle ?? resume.style}
      />

      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        resume={resume}
        onChange={(row) => setResume((prev) => ({ ...prev, is_public: row.is_public, slug: row.slug }))}
        notify={notify}
      />
    </div>
  )
}

function TabButton({ active, onClick, icon, children }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cx(
        'relative flex items-center gap-2 py-4 text-sm font-medium transition-colors',
        active ? 'text-ink' : 'text-muted hover:text-ink',
      )}
    >
      {icon}
      {children}
      {active && (
        <motion.span
          layoutId="editor-tab"
          className="absolute inset-x-0 -bottom-px h-0.5 bg-ink"
          transition={{ type: 'spring', stiffness: 420, damping: 36 }}
        />
      )}
    </button>
  )
}

function SaveIndicator({ state }) {
  const map = {
    saved: [<Check key="i" className="size-3.5" />, 'Saved'],
    pending: [<LoaderCircle key="i" className="size-3.5" />, 'Editing'],
    saving: [<LoaderCircle key="i" className="size-3.5 animate-spin" />, 'Saving'],
    error: [<TriangleAlert key="i" className="size-3.5" />, 'Not saved'],
  }
  const [icon, text] = map[state]
  return (
    <span
      className={cx('eyebrow hidden items-center gap-1.5 sm:flex', state === 'error' && 'text-red-600')}
      aria-live="polite"
    >
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
      <div className="space-y-5">
        <p className="text-sm leading-relaxed text-ink-2">
          Anyone with the link can view and download your resume. Switch it off at any time to make it private again.
        </p>
        <div className="rounded-2xl border border-line bg-white p-4">
          <Toggle label={busy ? 'Updating…' : 'Public link'} checked={resume.is_public} onChange={toggle} />
        </div>
        {resume.is_public && url && (
          <div className="flex gap-2">
            <input
              readOnly
              value={url}
              aria-label="Public link"
              className="min-w-0 flex-1 rounded-full border border-line bg-white px-4 py-2 font-mono text-xs text-ink-2"
              onFocus={(e) => e.target.select()}
            />
            <Button variant="secondary" onClick={copy} aria-label="Copy link" className="px-3.5">
              <Copy className="size-4" />
            </Button>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-full px-3.5 text-ink ring-1 ring-line transition ring-inset hover:ring-ink/40"
              aria-label="Open link in a new tab"
            >
              <ExternalLink className="size-4" />
            </a>
          </div>
        )}
        {isLocalMode && <p className="eyebrow">Demo mode: public links only work in this browser.</p>}
      </div>
    </Modal>
  )
}
