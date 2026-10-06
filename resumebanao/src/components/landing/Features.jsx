import MaskedLines from '../motion/MaskedLines'
import Reveal from '../motion/Reveal'
import { Eyebrow } from '../ui'

const FEATURES = [
  ['Real pages, live', 'What you see is exactly what prints — page breaks included.', 'Preview'],
  ['Make it yours', 'Fonts, colours, columns, spacing, headings, photo and more.', 'Design'],
  ['Clean PDF export', 'Selectable text and working links. Readable by applicant tracking systems.', 'Export'],
  ['Share with a link', 'Publish a web version of your resume and switch it off any time.', 'Share'],
  ['Writing help', 'Turn rough notes into crisp, results-focused bullet points with AI.', 'AI'],
  ['Private by default', 'Your resumes stay yours until you decide to share them.', 'Privacy'],
]

// A list in which every row fills with ink from the bottom on hover.
export default function Features() {
  return (
    <section aria-label="Features" className="px-5 pb-28 sm:px-8 lg:pb-40">
      <div className="mx-auto max-w-7xl">
        <Eyebrow index="04">Details</Eyebrow>
        <MaskedLines
          className="mt-5 text-[clamp(2.4rem,5vw,4.5rem)] leading-[0.95] font-medium tracking-[-0.045em]"
          lines={[
            <>
              Small things, <span className="font-serif font-normal italic">done well.</span>
            </>,
          ]}
        />
        <ul className="mt-16 border-t border-line">
          {FEATURES.map(([title, text, tag], i) => (
            <Reveal as="li" key={title} delay={i * 0.04} y={16}>
              <div className="group relative overflow-hidden border-b border-line">
                <span
                  aria-hidden="true"
                  className="absolute inset-0 origin-bottom scale-y-0 bg-ink transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-y-100"
                />
                <div className="relative grid gap-2 px-1 py-7 transition-[padding,color] duration-700 ease-[var(--ease-out-expo)] group-hover:px-5 group-hover:text-paper md:grid-cols-12 md:items-center md:gap-6">
                  <span className="font-mono text-xs text-muted transition-colors group-hover:text-accent md:col-span-1">
                    0{i + 1}
                  </span>
                  <h3 className="text-2xl font-medium tracking-tight md:col-span-4 md:text-3xl">{title}</h3>
                  <p className="text-ink-2 transition-colors group-hover:text-paper/70 md:col-span-5">{text}</p>
                  <span className="eyebrow hidden text-right transition-colors group-hover:text-paper/60 md:col-span-2 md:block">
                    {tag}
                  </span>
                </div>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}
