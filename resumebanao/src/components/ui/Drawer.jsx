import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { EASE_OUT } from '../../lib/motion'

// A panel that slides in from the right over the page. Closes on Escape or a
// click on the backdrop; focus moves into the panel and back afterwards.
export default function Drawer({ open, onClose, label, children }) {
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement
    // Move focus into the panel unless a field inside it already took it (autoFocus).
    if (!panelRef.current?.contains(document.activeElement)) panelRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      previous?.focus?.()
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex justify-end bg-ink/25 backdrop-blur-[1px]"
          onMouseDown={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            tabIndex={-1}
            onMouseDown={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-[720px] flex-col bg-paper shadow-2xl shadow-ink/25 outline-none sm:border-l sm:border-line"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.55, ease: EASE_OUT }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
