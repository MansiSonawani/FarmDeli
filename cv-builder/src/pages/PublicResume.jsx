import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Download } from 'lucide-react'
import Logo from '../components/Logo'
import PageTransition from '../components/motion/PageTransition'
import ResumePreview from '../components/resume/ResumePreview'
import { Button, FullPageSpinner } from '../components/ui'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { DEFAULT_STYLE } from '../lib/defaults'
import { getPublicResume } from '../lib/store'

export default function PublicResume() {
  const { slug } = useParams()
  // undefined = loading, null = not found
  const [resume, setResume] = useState(undefined)
  const name = resume?.data?.personal?.fullName
  useDocumentTitle(name ? `${name} – Resume` : 'Resume')

  useEffect(() => {
    getPublicResume(slug)
      .then((row) => setResume(row ?? null))
      .catch(() => setResume(null))
  }, [slug])

  if (resume === undefined) return <FullPageSpinner />

  if (resume === null) {
    return (
      <div className="flex min-h-dvh flex-col items-start justify-center px-6 sm:px-16">
        <p className="eyebrow">Private or missing</p>
        <h1 className="mt-4 max-w-2xl text-5xl font-medium tracking-[-0.04em] sm:text-7xl">
          This resume <span className="font-serif font-normal italic">isn&apos;t available.</span>
        </h1>
        <p className="mt-5 text-ink-2">The link may be wrong, or its owner has made it private.</p>
        <Link to="/" className="link-underline mt-8 text-sm font-medium">
          Create your own resume
        </Link>
      </div>
    )
  }

  const style = { ...DEFAULT_STYLE, ...resume.style }
  const p = resume.data.personal

  return (
    <div className="canvas-dots min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-line bg-paper/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-4 px-4">
          <div className="min-w-0">
            <div className="truncate font-medium text-ink">{p.fullName || resume.title}</div>
            {p.jobTitle && <div className="eyebrow truncate">{p.jobTitle}</div>}
          </div>
          <Button size="sm" onClick={() => window.print()}>
            <Download className="size-4" /> Download PDF
          </Button>
        </div>
      </header>
      <PageTransition>
        <main className="mx-auto max-w-4xl px-2 py-8 sm:px-4">
          <ResumePreview data={resume.data} style={style} printable maxZoom={1.25} />
        </main>
      </PageTransition>
      <footer className="flex justify-center pb-10">
        <Link to="/" className="eyebrow inline-flex items-center gap-2 transition-colors hover:text-ink">
          Made with <Logo className="scale-90" />
        </Link>
      </footer>
    </div>
  )
}
