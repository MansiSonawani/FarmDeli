import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, Expand, Shrink, ZoomIn } from 'lucide-react'
import PaginatedResume from '../resume/PaginatedResume'
import { Button } from '../ui'
import { cx } from '../../lib/cx'
import { EASE_OUT } from '../../lib/motion'
import { MM_TO_PX, PAGE_SIZES } from '../../lib/paginate'

const PAGE_SHADOW = '0 1px 2px rgb(18 18 17 / 0.08), 0 20px 60px -16px rgb(18 18 17 / 0.35)'
const BAR_HEIGHT = 56 // px, the top bar
const GAP = 24 // px of breathing room around the page

// Wraps the editor's preview: while the pointer is over a page it shows a zoom cursor and a magnifier that follows
// the pointer, and clicking a page calls `onOpen`. The pointer must be over the page itself, not the canvas around it.
export function ZoomTrigger({ onOpen, children }) {
  const [point, setPoint] = useState(null)
  const overPage = (e) => Boolean(e.target.closest?.('.cv-page'))

  return (
    <div
      className="relative"
      style={{ cursor: point ? 'zoom-in' : undefined }}
      onMouseMove={(e) => {
        if (!overPage(e)) return setPoint(null)
        const box = e.currentTarget.getBoundingClientRect()
        setPoint({ x: e.clientX - box.left, y: e.clientY - box.top })
      }}
      onMouseLeave={() => setPoint(null)}
      onClick={(e) => {
        if (!overPage(e)) return
        e.preventDefault() // contact links in the preview should not navigate away from the editor
        onOpen()
      }}
    >
      {children}
      <span
        aria-hidden="true"
        className={cx(
          'pointer-events-none absolute z-10 flex size-11 items-center justify-center rounded-full bg-ink/85 text-paper shadow-lg backdrop-blur transition-opacity duration-200',
          point ? 'opacity-100' : 'opacity-0',
        )}
        style={{ left: point?.x ?? 0, top: point?.y ?? 0, transform: 'translate(16px, 16px)' }}
      >
        <ZoomIn className="size-5" />
      </span>
    </div>
  )
}

// The resume at full size over the whole screen. "Fit page" scales one whole page to the screen; "Actual size"
// shows it at its real printed size and lets you scroll.
export default function ResumeLightbox({ open, onClose, data, style }) {
  return <AnimatePresence>{open && <Overlay onClose={onClose} data={data} style={style} />}</AnimatePresence>
}

function Overlay({ onClose, data, style }) {
  const [mode, setMode] = useState('fit') // fit | actual
  const [pages, setPages] = useState(1)
  const [screen, setScreen] = useState({ width: window.innerWidth, height: window.innerHeight })
  const backRef = useRef(null)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    const onResize = () => setScreen({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    backRef.current?.focus()
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
      document.body.style.overflow = previous
    }
  }, [onClose])

  const size = PAGE_SIZES[style.pageSize] ?? PAGE_SIZES.A4
  const pageWidth = size.width * MM_TO_PX
  const pageHeight = size.height * MM_TO_PX
  const fit = Math.min((screen.width - 2 * GAP) / pageWidth, (screen.height - BAR_HEIGHT - 2 * GAP) / pageHeight, 2.5)
  const zoom = mode === 'fit' ? Math.max(fit, 0.1) : 1

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Resume at full size"
      className="canvas-dots fixed inset-0 z-50 flex flex-col print:hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: EASE_OUT }}
    >
      <div
        className="flex flex-none items-center justify-between gap-3 border-b border-line bg-paper/90 px-3 backdrop-blur sm:px-5"
        style={{ height: BAR_HEIGHT }}
      >
        <Button ref={backRef} variant="secondary" size="sm" onClick={onClose}>
          <ArrowLeft className="size-4" /> Back to editor
        </Button>
        <span className="eyebrow hidden sm:inline">
          {pages} {pages === 1 ? 'page' : 'pages'} · {style.pageSize}
        </span>
        <Button variant="ghost" size="sm" onClick={() => setMode(mode === 'fit' ? 'actual' : 'fit')}>
          {mode === 'fit' ? <Expand className="size-4" /> : <Shrink className="size-4" />}
          {mode === 'fit' ? 'Actual size' : 'Fit page'}
        </Button>
      </div>

      {/* Clicking the canvas around the pages also goes back. */}
      <div className="min-h-0 flex-1 overflow-auto" onClick={onClose}>
        <div className="flex min-h-full justify-center" style={{ padding: GAP, '--cv-page-shadow': PAGE_SHADOW }}>
          <div onClick={(e) => e.stopPropagation()}>
            <PaginatedResume data={data} style={style} zoom={zoom} onPages={setPages} />
          </div>
        </div>
      </div>
    </motion.div>
  )
}
