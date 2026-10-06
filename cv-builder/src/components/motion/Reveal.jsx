import { motion } from 'motion/react'
import { DURATION, EASE_OUT } from '../../lib/motion'

// Fades and lifts its children into place the first time they scroll into view.
export default function Reveal({ as = 'div', delay = 0, y = 28, className, children, ...props }) {
  const Component = motion[as]
  return (
    <Component
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: DURATION.base, ease: EASE_OUT, delay }}
      {...props}
    >
      {children}
    </Component>
  )
}
