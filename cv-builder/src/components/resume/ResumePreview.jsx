import { useEffect, useRef, useState } from 'react'
import PaginatedResume from './PaginatedResume'
import { MM_TO_PX, PAGE_SIZES } from '../../lib/paginate'

// Fits the paginated resume to the available width.
export default function ResumePreview({ data, style, printable = false, onPages, maxZoom = 1.1, padding = 32 }) {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Ignore 0 widths (e.g. while printing, when the app shell is hidden) so the pages stay mounted.
    const observer = new ResizeObserver(([entry]) => entry.contentRect.width > 0 && setWidth(entry.contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const pageWidthPx = (PAGE_SIZES[style.pageSize] ?? PAGE_SIZES.A4).width * MM_TO_PX
  const zoom = width ? Math.min(maxZoom, (width - padding) / pageWidthPx) : 0

  return (
    <div ref={ref} className="w-full" style={{ '--cv-page-shadow': '0 1px 3px rgb(0 0 0 / 0.08), 0 8px 24px rgb(15 23 42 / 0.08)' }}>
      {zoom > 0 && (
        <div className="flex justify-center">
          <PaginatedResume data={data} style={style} zoom={zoom} printable={printable} onPages={onPages} />
        </div>
      )}
    </div>
  )
}
