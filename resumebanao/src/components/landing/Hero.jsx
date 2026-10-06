import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowDown, ArrowRight } from 'lucide-react'
import MaskedLines from '../motion/MaskedLines'
import Magnetic from '../motion/Magnetic'
import ResumeStack from './ResumeStack'
import { Eyebrow } from '../ui'
import { EASE_OUT } from '../../lib/motion'

const fade = (delay) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.9, ease: EASE_OUT, delay },
})

export default function Hero({ ctaHref }) {
  const ref = useRef(null)
  return (
    <section ref={ref} className="relative overflow-hidden px-5 pt-32 pb-20 sm:px-8 lg:min-h-dvh lg:pt-36">
      <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-7">
          <motion.div {...fade(0.1)}>
            <Eyebrow index="01">Resume builder — free forever</Eyebrow>
          </motion.div>
          <MaskedLines
            as="h1"
            trigger="mount"
            delay={0.15}
            className="mt-6 text-[clamp(3.1rem,8.4vw,8.25rem)] leading-[0.9] font-medium tracking-[-0.055em] text-ink"
            lines={[
              'Your career,',
              'beautifully',
              <>
                <span className="font-serif font-normal tracking-[-0.02em] italic">set in type</span>
                <span className="text-accent">.</span>
              </>,
            ]}
          />
          <motion.p {...fade(0.75)} className="mt-8 max-w-md text-lg leading-relaxed text-ink-2">
            Write once, pick a design and download a pixel-perfect PDF. No watermarks, no clutter — just your story,
            typeset with care.
          </motion.p>
          <motion.div {...fade(0.9)} className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
            <Magnetic>
              <Link
                to={ctaHref}
                className="group relative inline-flex h-14 items-center gap-3 overflow-hidden rounded-full bg-ink pr-2 pl-7 text-[15px] font-medium text-paper"
              >
                <span className="relative z-10">Build my resume</span>
                <span className="relative z-10 flex size-10 items-center justify-center rounded-full bg-accent text-white transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:translate-x-1">
                  <ArrowRight className="size-4" />
                </span>
              </Link>
            </Magnetic>
            <a href="#templates" className="group inline-flex items-center gap-2 text-sm font-medium text-ink">
              <span className="link-underline pb-0.5">See the templates</span>
              <ArrowDown className="size-4 transition-transform duration-500 group-hover:translate-y-0.5" />
            </a>
          </motion.div>
          <motion.ul {...fade(1.05)} className="mt-14 flex flex-wrap gap-x-6 gap-y-2" aria-label="Highlights">
            {['ATS-friendly', 'Unlimited PDFs', 'Six templates'].map((item) => (
              <li key={item} className="eyebrow flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
                {item}
              </li>
            ))}
          </motion.ul>
        </div>
        <div className="lg:col-span-5">
          <ResumeStack targetRef={ref} />
        </div>
      </div>
    </section>
  )
}
