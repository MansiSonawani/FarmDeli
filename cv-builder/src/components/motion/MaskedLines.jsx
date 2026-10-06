import { motion } from 'motion/react'
import { DURATION, EASE_OUT } from '../../lib/motion'

// Each line slides up from behind a mask, one after another – the classic
// editorial headline reveal. Pass an array of lines (strings or nodes).
//   trigger: 'mount' animates immediately, 'view' waits until it scrolls into view.
export default function MaskedLines({
  lines,
  as = 'h2',
  className,
  lineClassName,
  delay = 0,
  stagger = 0.09,
  trigger = 'view',
}) {
  const Tag = as
  const animateProps =
    trigger === 'mount'
      ? { initial: 'hidden', animate: 'show' }
      : { initial: 'hidden', whileInView: 'show', viewport: { once: true, margin: '0px 0px -10% 0px' } }

  return (
    <Tag className={className}>
      <motion.span
        className="block"
        variants={{ show: { transition: { staggerChildren: stagger, delayChildren: delay } } }}
        {...animateProps}
      >
        {lines.map((line, i) => (
          // pb/-mb keeps descenders (g, y, p) from being clipped by the mask.
          <span key={i} className="-mb-[0.12em] block overflow-hidden pb-[0.12em]">
            <motion.span
              className={`block will-change-transform ${lineClassName ?? ''}`}
              variants={{
                hidden: { y: '110%', rotate: 2 },
                show: { y: '0%', rotate: 0, transition: { duration: DURATION.slow, ease: EASE_OUT } },
              }}
            >
              {line}
            </motion.span>
          </span>
        ))}
      </motion.span>
    </Tag>
  )
}
