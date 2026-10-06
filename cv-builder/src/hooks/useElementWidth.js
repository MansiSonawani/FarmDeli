import { useEffect, useRef, useState } from 'react'

// Tracks an element's content width. Zero widths are ignored (e.g. while printing,
// when the app shell is hidden) so dependent layouts stay mounted.
export function useElementWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) setWidth(entry.contentRect.width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return [ref, width]
}
