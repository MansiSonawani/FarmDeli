import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useMotionValueEvent, useScroll } from 'motion/react'
import { ArrowUpRight } from 'lucide-react'
import Logo from '../Logo'
import Magnetic from '../motion/Magnetic'
import { cx } from '../../lib/cx'
import { EASE_OUT } from '../../lib/motion'

export default function Nav({ signedIn }) {
  const { scrollY } = useScroll()
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)

  // Hide while scrolling down, show again when scrolling up.
  useMotionValueEvent(scrollY, 'change', (y) => {
    const previous = scrollY.getPrevious() ?? 0
    setScrolled(y > 24)
    setHidden(y > 400 && y > previous)
  })

  return (
    <motion.header
      className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-5"
      initial={{ y: -80 }}
      animate={{ y: hidden ? -90 : 0 }}
      transition={{ duration: 0.6, ease: EASE_OUT }}
    >
      <nav
        aria-label="Main"
        className={cx(
          'mx-auto flex h-14 max-w-7xl items-center justify-between rounded-full pr-2 pl-5 transition-[background-color,box-shadow,backdrop-filter] duration-500',
          scrolled && 'bg-paper/75 shadow-[0_1px_0_0_var(--color-line)] backdrop-blur-xl',
        )}
      >
        <Link to="/" aria-label="resumebanao home">
          <Logo />
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <a
            href="#templates"
            className="hidden rounded-full px-4 py-2 text-sm text-ink-2 transition-colors hover:text-ink md:block"
          >
            Templates
          </a>
          <a
            href="#process"
            className="hidden rounded-full px-4 py-2 text-sm text-ink-2 transition-colors hover:text-ink md:block"
          >
            How it works
          </a>
          {!signedIn && (
            <Link to="/login" className="rounded-full px-4 py-2 text-sm text-ink-2 transition-colors hover:text-ink">
              Sign in
            </Link>
          )}
          <Magnetic strength={0.25}>
            <Link
              to={signedIn ? '/app' : '/signup'}
              className="group inline-flex h-10 items-center gap-1.5 rounded-full bg-ink pr-3 pl-5 text-sm font-medium text-paper transition-colors hover:bg-ink-2"
            >
              {signedIn ? 'My resumes' : 'Start free'}
              <ArrowUpRight className="size-4 transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:rotate-45" />
            </Link>
          </Magnetic>
        </div>
      </nav>
    </motion.header>
  )
}
