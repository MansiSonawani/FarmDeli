import { AnimatePresence, motion } from 'motion/react'
import { EASE_OUT } from '../../lib/motion'

// Animates height between 0 and auto when `open` changes.
export default function Collapse({ open, children }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.45, ease: EASE_OUT }}
          className="overflow-hidden"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
