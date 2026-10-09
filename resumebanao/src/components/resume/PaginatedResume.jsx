import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { buildBlocks } from './blocks'
import { cssVars } from '../../lib/geometry'
import { MM_TO_PX, packColumns } from '../../lib/paginate'
import './resume.css'

// Renders a resume as real, fixed-size pages.
//
// 1. All blocks are rendered once, off-screen, at their exact column width.
// 2. Their heights are measured and packed into pages (lib/paginate.js).
// 3. The pages are rendered with the same CSS, so preview == printed PDF.
//
// Props:
//   zoom       – visual scale for the on-screen pages (1 = real size)
//   maxPages   – only render the first N pages (thumbnails)
//   printable  – also render an unscaled copy for window.print()
//   links      – render contact details / entry links as clickable links
//   onPages    – called with the page count after each layout
export default function PaginatedResume({
  data,
  style,
  zoom = 1,
  maxPages,
  printable = false,
  links = true,
  onPages,
  pageGap = 24,
}) {
  const model = useMemo(() => buildBlocks(data, style, { links }), [data, style, links])
  const { geometry, header, columns } = model
  const measureRef = useRef(null)
  const [pages, setPages] = useState(null)

  const layout = useCallback(() => {
    const root = measureRef.current
    // While printing the measurer is display:none and reports 0 heights; keep the last layout.
    if (!root || root.offsetWidth === 0) return
    const headerEl = root.querySelector('[data-measure="header"]')
    const headerHeight = headerEl ? headerEl.getBoundingClientRect().height : 0
    const measured = {}
    for (const [column, blocks] of Object.entries(columns)) {
      measured[column] = blocks.map((block) => {
        const el = root.querySelector(`[data-col="${column}"] > [data-key="${CSS.escape(block.key)}"]`)
        return {
          key: block.key,
          height: el ? el.getBoundingClientRect().height : 0,
          trailing: block.gap * MM_TO_PX,
        }
      })
    }
    const contentHeight = (geometry.height - 2 * style.margin) * MM_TO_PX
    const next = packColumns(measured, contentHeight, headerHeight)
    setPages((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next))
  }, [columns, geometry.height, style.margin])

  useLayoutEffect(layout, [layout])

  // Web fonts and images change block heights after the first layout.
  useEffect(() => {
    const root = measureRef.current
    if (!root) return
    const observer = new ResizeObserver(() => layout())
    observer.observe(root)
    root.querySelectorAll('[data-key], [data-measure]').forEach((el) => observer.observe(el))
    document.fonts?.ready.then(layout)
    document.fonts?.addEventListener?.('loadingdone', layout)
    return () => {
      observer.disconnect()
      document.fonts?.removeEventListener?.('loadingdone', layout)
    }
  }, [layout])

  useEffect(() => {
    if (pages) onPages?.(pages.length)
  }, [pages, onPages])

  const nodes = useMemo(() => {
    const map = {}
    for (const blocks of Object.values(columns)) for (const b of blocks) map[b.key] = b
    return map
  }, [columns])

  const vars = cssVars(style)
  const visiblePages = (pages ?? [{}]).slice(0, maxPages ?? Infinity)

  const renderPage = (page, index) => (
    <Page key={index} index={index} page={page} geometry={geometry} style={style} header={header} nodes={nodes} />
  )

  return (
    <>
      {createPortal(
        <div
          ref={measureRef}
          className="cv-root cv-measure"
          style={{ ...vars, width: `${geometry.width}mm` }}
          aria-hidden="true"
        >
          {header && (
            <div data-measure="header" className="cv-block" style={{ width: `${geometry.inner}mm` }}>
              {header}
            </div>
          )}
          {geometry.columns.map((col) => (
            <div
              key={col.name}
              data-col={col.name}
              className={geometry.sidebarFilled && col.name === 'side' ? 'cv-filled' : ''}
              style={{ width: `${col.width}mm` }}
            >
              {columns[col.name].map((block) => (
                <div
                  key={block.key}
                  data-key={block.key}
                  className="cv-block"
                  style={{ paddingBottom: `${block.gap}mm` }}
                >
                  {block.node}
                </div>
              ))}
            </div>
          ))}
        </div>,
        document.body,
      )}

      <div className="cv-root" style={{ ...vars, zoom, display: 'flex', flexDirection: 'column', gap: pageGap / zoom }}>
        {visiblePages.map(renderPage)}
      </div>

      {printable &&
        createPortal(
          <div className="cv-print-root cv-root" style={vars}>
            <style>{`@page { size: ${style.pageSize === 'Letter' ? 'letter' : 'A4'}; margin: 0; }`}</style>
            {(pages ?? [{}]).map(renderPage)}
          </div>,
          document.body,
        )}
    </>
  )
}

function Page({ index, page, geometry, style, header, nodes }) {
  const { columns, sidebarFilled } = geometry
  const sideOnLeft = style.layout === 'left'
  const sideWidth = columns.find((c) => c.name === 'side')?.width ?? 0
  return (
    <div
      className="cv-page"
      data-page={index + 1}
      style={{
        width: `${geometry.width}mm`,
        height: `${geometry.height}mm`,
        flex: 'none',
        boxShadow: 'var(--cv-page-shadow, none)',
      }}
    >
      {sidebarFilled && (
        <div
          className="cv-side-fill"
          style={{
            [sideOnLeft ? 'left' : 'right']: 0,
            width: `${style.margin + sideWidth + style.columnGap / 2}mm`,
          }}
        />
      )}
      <div className="cv-page-inner" style={{ padding: `${style.margin}mm` }}>
        {index === 0 && header && <div className="cv-block">{header}</div>}
        <div className="cv-cols" style={{ gap: `${style.columnGap}mm` }}>
          {columns.map((col) => (
            <div
              key={col.name}
              className={sidebarFilled && col.name === 'side' ? 'cv-filled' : ''}
              style={{ width: `${col.width}mm`, flex: 'none' }}
            >
              {(page[col.name] ?? []).map((key) =>
                nodes[key] ? (
                  <div key={key} data-key={key} className="cv-block" style={{ paddingBottom: `${nodes[key].gap}mm` }}>
                    {nodes[key].node}
                  </div>
                ) : null,
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
