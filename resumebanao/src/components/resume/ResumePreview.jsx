import PaginatedResume from './PaginatedResume'
import { useElementWidth } from '../../hooks/useElementWidth'
import { MM_TO_PX, PAGE_SIZES } from '../../lib/paginate'

const PAGE_SHADOW = '0 1px 2px rgb(18 18 17 / 0.06), 0 12px 40px -12px rgb(18 18 17 / 0.18)'

// Fits the paginated resume to the available width.
export default function ResumePreview({ data, style, printable = false, onPages, maxZoom = 1.1, padding = 32 }) {
  const [ref, width] = useElementWidth()
  const pageWidthPx = (PAGE_SIZES[style.pageSize] ?? PAGE_SIZES.A4).width * MM_TO_PX
  const zoom = width ? Math.min(maxZoom, (width - padding) / pageWidthPx) : 0

  return (
    <div ref={ref} className="w-full" style={{ '--cv-page-shadow': PAGE_SHADOW }}>
      {zoom > 0 && (
        <div className="flex justify-center">
          <PaginatedResume data={data} style={style} zoom={zoom} printable={printable} onPages={onPages} />
        </div>
      )}
    </div>
  )
}
