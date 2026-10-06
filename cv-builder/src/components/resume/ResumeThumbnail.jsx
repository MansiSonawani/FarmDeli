import { useEffect, useRef, useState } from 'react'
import PaginatedResume from './PaginatedResume'
import { MM_TO_PX, PAGE_SIZES } from '../../lib/paginate'

// First page of a resume, scaled down to fill its container's width.
export default function ResumeThumbnail({ data, style }) {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    // Ignore 0 widths (e.g. while printing, when the app shell is hidden) so the pages stay mounted.
    const observer = new ResizeObserver(([entry]) => entry.contentRect.width > 0 && setWidth(entry.contentRect.width))
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  const page = PAGE_SIZES[style.pageSize] ?? PAGE_SIZES.A4
  const zoom = width / (page.width * MM_TO_PX)

  return (
    <div ref={ref} className="pointer-events-none w-full overflow-hidden bg-white" style={{ aspectRatio: `${page.width} / ${page.height}` }}>
      {zoom > 0 && <PaginatedResume data={data} style={style} zoom={zoom} maxPages={1} links={false} />}
    </div>
  )
}
