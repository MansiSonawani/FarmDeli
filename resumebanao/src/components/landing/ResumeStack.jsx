import { useMemo } from 'react'
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react'
import ResumeThumbnail from '../resume/ResumeThumbnail'
import { sampleResume } from '../../lib/defaults'
import { templateStyle } from '../../lib/templates'
import { EASE_OUT } from '../../lib/motion'

const CARDS = [
  { template: 'classic', x: '-30%', rotate: -9, depth: 18, lift: 60 },
  { template: 'executive', x: '30%', rotate: 8, depth: 26, lift: 110 },
  { template: 'modern', x: '0%', rotate: -1, depth: 36, lift: 170 },
]

// Three live-rendered resumes fanned out like paper on a desk. They spread on
// scroll and drift with the pointer for a sense of depth.
export default function ResumeStack({ targetRef }) {
  const reduce = useReducedMotion()
  const data = useMemo(() => sampleResume(), [])
  const { scrollYProgress } = useScroll({ target: targetRef, offset: ['start start', 'end start'] })

  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const sx = useSpring(px, { stiffness: 60, damping: 18 })
  const sy = useSpring(py, { stiffness: 60, damping: 18 })

  const onMove = (e) => {
    if (reduce) return
    const rect = e.currentTarget.getBoundingClientRect()
    px.set((e.clientX - rect.left) / rect.width - 0.5)
    py.set((e.clientY - rect.top) / rect.height - 0.5)
  }

  return (
    <div
      className="relative mx-auto aspect-[4/5] w-full max-w-[34rem]"
      onPointerMove={onMove}
      onPointerLeave={() => {
        px.set(0)
        py.set(0)
      }}
    >
      {CARDS.map((card, i) => (
        <Card key={card.template} card={card} index={i} data={data} progress={scrollYProgress} sx={sx} sy={sy} />
      ))}
    </div>
  )
}

function Card({ card, index, data, progress, sx, sy }) {
  const x = useTransform(sx, (v) => v * card.depth)
  const yPointer = useTransform(sy, (v) => v * card.depth)
  const yScroll = useTransform(progress, [0, 1], [0, -card.lift])
  const y = useTransform([yPointer, yScroll], ([a, b]) => a + b)
  const rotate = useTransform(progress, [0, 1], [card.rotate, card.rotate * 1.8])
  const style = useMemo(() => templateStyle(card.template), [card.template])

  return (
    <motion.div className="absolute inset-x-[17%] top-[6%]" style={{ x, y, rotate, zIndex: index }}>
      <motion.div
        initial={{ opacity: 0, y: 160, rotate: 0, x: '0%' }}
        animate={{ opacity: 1, y: 0, rotate: 0, x: card.x }}
        transition={{ duration: 1.4, ease: EASE_OUT, delay: 0.35 + index * 0.12 }}
      >
        <div className="overflow-hidden rounded-[6px] shadow-[0_2px_4px_rgb(18_18_17/0.06),0_30px_60px_-20px_rgb(18_18_17/0.35)] ring-1 ring-ink/5">
          <ResumeThumbnail data={data} style={style} />
        </div>
      </motion.div>
    </motion.div>
  )
}
