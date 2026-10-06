import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Download } from 'lucide-react'
import ResumePreview from '../components/resume/ResumePreview'
import Logo from '../components/Logo'
import { Button, FullPageSpinner } from '../components/ui'
import { DEFAULT_STYLE } from '../lib/defaults'
import { getPublicResume } from '../lib/store'

export default function PublicResume() {
  const { slug } = useParams()
  const [resume, setResume] = useState(undefined)

  useEffect(() => {
    getPublicResume(slug)
      .then((row) => setResume(row ?? null))
      .catch(() => setResume(null))
  }, [slug])

  useEffect(() => {
    const name = resume?.data?.personal?.fullName
    if (name) document.title = `${name} – Resume`
  }, [resume])

  if (resume === undefined) return <FullPageSpinner />

  if (resume === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-xl font-semibold text-slate-900">This resume isn't available</h1>
        <p className="text-sm text-slate-500">The link may be wrong, or its owner has made it private.</p>
        <Link to="/" className="mt-2 text-sm font-medium text-indigo-600 hover:underline">
          Create your own resume
        </Link>
      </div>
    )
  }

  const style = { ...DEFAULT_STYLE, ...resume.style }
  const p = resume.data.personal

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <div className="min-w-0">
            <div className="truncate font-semibold text-slate-900">{p.fullName || resume.title}</div>
            {p.jobTitle && <div className="truncate text-xs text-slate-500">{p.jobTitle}</div>}
          </div>
          <Button size="sm" onClick={() => window.print()}>
            <Download className="size-4" /> Download PDF
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-2 py-6 sm:px-4">
        <ResumePreview data={resume.data} style={style} printable maxZoom={1.25} />
      </main>
      <footer className="pb-8 text-center text-xs text-slate-400">
        <Link to="/" className="inline-flex items-center gap-1 hover:text-slate-600">
          Made with <Logo className="scale-75" />
        </Link>
      </footer>
    </div>
  )
}
