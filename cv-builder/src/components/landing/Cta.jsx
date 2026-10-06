import { Link } from 'react-router-dom'
import { ArrowUp, ArrowUpRight } from 'lucide-react'
import Logo from '../Logo'
import Magnetic from '../motion/Magnetic'
import MaskedLines from '../motion/MaskedLines'
import Marquee from '../motion/Marquee'
import { scrollToY } from '../../lib/scroll'

export default function Cta({ ctaHref }) {
  return (
    <footer className="relative overflow-hidden rounded-t-[2rem] bg-ink text-paper sm:rounded-t-[3rem]">
      <div className="mx-auto max-w-7xl px-5 pt-24 pb-10 sm:px-8 lg:pt-36">
        <div className="flex flex-col gap-14 lg:flex-row lg:items-end lg:justify-between">
          <MaskedLines
            as="h2"
            className="text-[clamp(3rem,9vw,9rem)] leading-[0.88] font-medium tracking-[-0.055em]"
            lines={[
              'Your next role',
              <>
                starts with a <span className="font-serif font-normal text-accent italic">page.</span>
              </>,
            ]}
          />
          <Magnetic strength={0.4} className="self-start lg:self-auto">
            <Link
              to={ctaHref}
              className="group flex size-36 flex-col items-center justify-center gap-1 rounded-full bg-accent text-center text-[15px] font-medium text-white transition-transform duration-700 ease-[var(--ease-out-expo)] hover:scale-105 sm:size-44"
            >
              <ArrowUpRight className="size-6 transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:rotate-45" />
              Start writing
            </Link>
          </Magnetic>
        </div>
      </div>
      <Marquee
        className="border-y border-paper/10 py-5 font-serif text-3xl text-paper/80 italic sm:text-4xl"
        items={['No watermarks', 'ATS-friendly', 'Live preview', 'Six templates', 'Share with a link', 'Free forever']}
      />
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <Logo inverted />
        <p className="eyebrow text-paper/50">
          © {new Date().getFullYear()} CV Builder — Made for people who care about details
        </p>
        <button
          type="button"
          onClick={() => scrollToY(0)}
          className="group inline-flex items-center gap-2 self-start text-sm text-paper/70 transition-colors hover:text-paper sm:self-auto"
        >
          Back to top
          <ArrowUp className="size-4 transition-transform duration-500 group-hover:-translate-y-0.5" />
        </button>
      </div>
    </footer>
  )
}
