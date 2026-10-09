import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react'
import MaskedLines from '../motion/MaskedLines'
import Reveal from '../motion/Reveal'
import ResumeThumbnail from '../resume/ResumeThumbnail'
import { Eyebrow } from '../ui'
import { sampleResume } from '../../lib/defaults'
import { TEMPLATES, templateStyle } from '../../lib/templates'
import { cx } from '../../lib/cx'
import { EASE_OUT } from '../../lib/motion'
import { scrollToY } from '../../lib/scroll'

const NOTES = {
  classic: 'Centred serif header and quiet rules. Timeless for law, academia and finance.',
  modern: 'A solid colour sidebar with skill bars. Made for product, design and tech.',
  minimal: 'Pure typography, zero ornament. Lets the work do the talking.',
  executive: 'A confident header band with elegant serif headings.',
  bold: 'Boxed headings and a crisp right-hand column that stands out.',
  compact: 'Tight rhythm that fits a decade of experience on one page.',
}

const heading = (
  <MaskedLines
    className="mt-5 text-[clamp(2.4rem,5vw,4.5rem)] leading-[0.95] font-medium tracking-[-0.045em]"
    lines={[
      'One story,',
      <>
        six <span className="font-serif font-normal italic">ways</span> to tell it.
      </>,
    ]}
  />
)

// Desktop: the section is pinned while scrolling and the active template changes
// with scroll progress. Mobile: a simple grid.
export default function Showcase() {
  const ref = useRef(null)
  const data = useMemo(() => sampleResume(), [])
  const styles = useMemo(() => TEMPLATES.map((t) => templateStyle(t.id)), [])
  const [active, setActive] = useState(0)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })

  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    setActive(Math.min(TEMPLATES.length - 1, Math.max(0, Math.floor(p * TEMPLATES.length))))
  })

  const jumpTo = (index) => {
    const el = ref.current
    const top = el.getBoundingClientRect().top + window.scrollY
    const travel = el.offsetHeight - window.innerHeight
    scrollToY(top + ((index + 0.5) / TEMPLATES.length) * travel)
  }

  return (
    <section id="templates" aria-label="Templates" className="scroll-mt-20">
      {/* Desktop, pinned */}
      <div ref={ref} className="relative hidden h-[420vh] lg:block">
        <div className="sticky top-0 flex h-dvh items-center px-8">
          <div className="mx-auto grid w-full max-w-7xl grid-cols-12 items-center gap-8">
            <div className="col-span-5">
              <Eyebrow index="02">Templates</Eyebrow>
              {heading}
              <ol className="mt-12 space-y-1">
                {TEMPLATES.map((t, i) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => jumpTo(i)}
                      aria-current={i === active}
                      className="group flex w-full items-baseline gap-5 py-1 text-left"
                    >
                      <span
                        className={cx(
                          'font-mono text-xs transition-colors duration-500',
                          i === active ? 'text-accent' : 'text-muted/60',
                        )}
                      >
                        0{i + 1}
                      </span>
                      <span
                        className={cx(
                          'font-serif text-[2.6rem] leading-none transition-all duration-700 ease-[var(--ease-out-expo)]',
                          i === active ? 'translate-x-2 text-ink italic' : 'text-ink/20 group-hover:text-ink/45',
                        )}
                      >
                        {t.name}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
            <div className="col-span-7 flex flex-col items-center">
              <div className="relative aspect-[210/297] w-full max-w-[29rem]">
                <AnimatePresence initial={false}>
                  <motion.div
                    key={TEMPLATES[active].id}
                    className="absolute inset-0 overflow-hidden rounded-[6px] shadow-[0_40px_80px_-30px_rgb(18_18_17/0.4)] ring-1 ring-ink/5"
                    initial={{ clipPath: 'inset(100% 0% 0% 0%)', scale: 1.04 }}
                    animate={{ clipPath: 'inset(0% 0% 0% 0%)', scale: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.4, delay: 0.5 } }}
                    transition={{ duration: 0.9, ease: EASE_OUT }}
                  >
                    <ResumeThumbnail data={data} style={styles[active]} />
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className="mt-8 flex w-full max-w-[29rem] items-start justify-between gap-6">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={TEMPLATES[active].id}
                    className="text-sm leading-relaxed text-ink-2"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.35, ease: EASE_OUT }}
                  >
                    {NOTES[TEMPLATES[active].id]}
                  </motion.p>
                </AnimatePresence>
                <span className="eyebrow shrink-0 tabular-nums">
                  {String(active + 1).padStart(2, '0')} / {String(TEMPLATES.length).padStart(2, '0')}
                </span>
              </div>
              <div className="mt-4 h-px w-full max-w-[29rem] bg-line">
                <motion.div className="h-px origin-left bg-ink" style={{ scaleX: scrollYProgress }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile and tablet */}
      <div className="px-5 py-24 sm:px-8 lg:hidden">
        <Eyebrow index="02">Templates</Eyebrow>
        {heading}
        <div className="mt-12 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3">
          {TEMPLATES.map((t, i) => (
            <Reveal key={t.id} delay={(i % 2) * 0.08}>
              <div className="overflow-hidden rounded-[4px] shadow-[0_20px_40px_-20px_rgb(18_18_17/0.35)] ring-1 ring-ink/5">
                <ResumeThumbnail data={data} style={styles[i]} />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-mono text-[11px] text-accent">0{i + 1}</span>
                <span className="font-serif text-2xl italic">{t.name}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
