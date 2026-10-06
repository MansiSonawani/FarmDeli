import PaginatedResume from './PaginatedResume'
import { useElementWidth } from '../../hooks/useElementWidth'
import { MM_TO_PX, PAGE_SIZES } from '../../lib/paginate'

// First page of a resume, scaled down to fill its container's width.
export default function ResumeThumbnail({ data, style, className = '' }) {
  const [ref, width] = useElementWidth()
  const page = PAGE_SIZES[style.pageSize] ?? PAGE_SIZES.A4
  const zoom = width / (page.width * MM_TO_PX)

  return (
    <div
      ref={ref}
      className={`pointer-events-none w-full overflow-hidden bg-white select-none ${className}`}
      style={{ aspectRatio: `${page.width} / ${page.height}` }}
      aria-hidden="true"
    >
      {zoom > 0 && <PaginatedResume data={data} style={style} zoom={zoom} maxPages={1} links={false} />}
    </div>
  )
}
