import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import MaskedLines from '../components/motion/MaskedLines'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export default function NotFound() {
  useDocumentTitle('Page not found')
  return (
    <main className="flex min-h-dvh flex-col justify-center px-6 sm:px-16">
      <p className="eyebrow">Error 404</p>
      <MaskedLines
        as="h1"
        trigger="mount"
        className="mt-4 text-[clamp(3rem,10vw,9rem)] leading-[0.9] font-medium tracking-[-0.055em]"
        lines={[
          'This page',
          <>
            went <span className="font-serif font-normal text-accent italic">missing.</span>
          </>,
        ]}
      />
      <Link to="/" className="group mt-10 inline-flex items-center gap-2 self-start text-sm font-medium">
        <ArrowLeft className="size-4 transition-transform duration-500 group-hover:-translate-x-1" />
        <span className="link-underline">Back to the homepage</span>
      </Link>
    </main>
  )
}
