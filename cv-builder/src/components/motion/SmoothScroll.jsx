import { useEffect } from 'react'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { setSmoothScroller } from '../../lib/scroll'

// Inertia-based smooth scrolling for marketing pages. Native scrolling is kept
// for people who prefer reduced motion and for touch devices.
export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const lenis = new Lenis({ duration: 1.15, easing: (t) => 1 - Math.pow(1 - t, 4), anchors: true })
    setSmoothScroller(lenis)
    let frame = requestAnimationFrame(function raf(time) {
      lenis.raf(time)
      frame = requestAnimationFrame(raf)
    })
    return () => {
      cancelAnimationFrame(frame)
      setSmoothScroller(null)
      lenis.destroy()
    }
  }, [])
  return null
}
