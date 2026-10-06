// Holds the active smooth-scroll instance (if any) so programmatic scrolling
// goes through it instead of fighting it.
let instance = null

export function setSmoothScroller(lenis) {
  instance = lenis
}

export function scrollToY(top) {
  if (instance) instance.scrollTo(top, { duration: 1.2 })
  else window.scrollTo({ top, behavior: 'smooth' })
}
