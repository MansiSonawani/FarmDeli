import { motion } from 'motion/react'
import { EASE_OUT } from '../../lib/motion'

// Soft entrance used by every route.
export default function PageTransition({ className, children }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  )
}
