import Nav from '../components/landing/Nav'
import Hero from '../components/landing/Hero'
import Showcase from '../components/landing/Showcase'
import Process from '../components/landing/Process'
import Features from '../components/landing/Features'
import Cta from '../components/landing/Cta'
import Marquee from '../components/motion/Marquee'
import SmoothScroll from '../components/motion/SmoothScroll'
import { useAuth } from '../hooks/useAuth'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export default function Landing() {
  const { user } = useAuth()
  const ctaHref = user ? '/app' : '/signup'
  useDocumentTitle(null)

  return (
    <div className="grain bg-paper">
      <SmoothScroll />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
      >
        Skip to content
      </a>
      <Nav signedIn={Boolean(user)} />
      <main id="main">
        <Hero ctaHref={ctaHref} />
        <Marquee
          duration={50}
          className="border-y border-line py-5 text-[clamp(1.5rem,3vw,2.25rem)] font-medium tracking-tight"
          items={['Write once', 'Design freely', 'Download instantly', 'Share anywhere', 'Get the interview']}
        />
        <Showcase />
        <Process />
        <Features />
      </main>
      <Cta ctaHref={ctaHref} />
    </div>
  )
}
