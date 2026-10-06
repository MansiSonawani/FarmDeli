import { motion } from 'motion/react'
import MaskedLines from '../motion/MaskedLines'
import Reveal from '../motion/Reveal'
import { Eyebrow } from '../ui'
import { EASE_OUT } from '../../lib/motion'

const STEPS = [
  ['Write', 'Fill in simple forms. Bullet points, highlights and dates are formatted for you as you type.'],
  ['Design', 'Choose a template, then tune fonts, colours, columns and spacing until it feels like you.'],
  ['Send', 'Download a crisp, ATS-readable PDF or share a live link. Update it whenever you like.'],
]

export default function Process() {
  return (
    <section id="process" aria-label="How it works" className="scroll-mt-20 px-5 py-28 sm:px-8 lg:py-40">
      <div className="mx-auto max-w-7xl">
        <Eyebrow index="03">How it works</Eyebrow>
        <MaskedLines
          className="mt-5 max-w-4xl text-[clamp(2.4rem,5vw,4.5rem)] leading-[0.95] font-medium tracking-[-0.045em]"
          lines={[
            'From a blank page',
            <>
              to <span className="font-serif font-normal italic">hired</span>, in three steps.
            </>,
          ]}
        />
        <ol className="mt-20 grid gap-12 md:grid-cols-3 md:gap-8">
          {STEPS.map(([title, text], i) => (
            <li key={title}>
              <motion.div
                className="h-px origin-left bg-ink"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, margin: '0px 0px -15% 0px' }}
                transition={{ duration: 1.2, ease: EASE_OUT, delay: i * 0.15 }}
              />
              <Reveal delay={0.15 + i * 0.15} className="pt-6">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-2xl font-medium tracking-tight">{title}</h3>
                  <span className="font-serif text-5xl text-accent italic">0{i + 1}</span>
                </div>
                <p className="mt-4 max-w-sm leading-relaxed text-ink-2">{text}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
