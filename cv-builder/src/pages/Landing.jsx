import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Download, LayoutTemplate, MousePointerClick, Palette, Share2, Sparkles } from 'lucide-react'
import Logo from '../components/Logo'
import ResumeThumbnail from '../components/resume/ResumeThumbnail'
import { useAuth } from '../context/AuthContext'
import { sampleResume } from '../lib/defaults'
import { templateStyle } from '../lib/templates'

const FEATURES = [
  [MousePointerClick, 'Live editor', 'Type on the left and watch your resume update on the right, page by page.'],
  [LayoutTemplate, 'Templates that adapt', 'Switch between layouts at any time – your content always stays in place.'],
  [Palette, 'Make it yours', 'Fonts, colors, spacing, columns, photo and heading styles are all adjustable.'],
  [Download, 'Clean PDF export', 'Real text, no watermark, ready for applicant tracking systems.'],
  [Share2, 'Shareable link', 'Publish your resume as a web page and send the link to recruiters.'],
  [Sparkles, 'AI writing help', 'Turn rough notes into crisp, results-focused bullet points.'],
]

export default function Landing() {
  const { user } = useAuth()
  const sample = useMemo(() => sampleResume(), [])
  const cta = user ? '/app' : '/signup'

  return (
    <div className="min-h-screen bg-white">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Logo />
        <nav className="flex items-center gap-2">
          {!user && (
            <Link to="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
              Sign in
            </Link>
          )}
          <Link to={cta} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700">
            {user ? 'My resumes' : 'Get started'}
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-10 pb-20 lg:grid-cols-2 lg:pt-16">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            <Sparkles className="size-3.5" /> Free resume builder
          </span>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            A resume you're proud to send, <span className="text-indigo-600">in minutes.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-slate-600">
            Fill in your details, pick a design and download a polished PDF. No design skills, no watermarks, no fuss.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={cta} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white shadow-sm hover:bg-indigo-700">
              Build my resume <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-md">
          <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-indigo-100 via-sky-50 to-emerald-50" />
          <div className="rotate-1 overflow-hidden rounded-lg shadow-2xl ring-1 ring-slate-200">
            <ResumeThumbnail data={sample} style={templateStyle('modern')} />
          </div>
        </div>
      </section>

      <section className="border-t border-slate-100 bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900">Everything you need, nothing you don't</h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(([Icon, title, text]) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Icon className="size-5" />
                </div>
                <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
                <p className="mt-1 text-sm text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-10 text-center text-sm text-slate-400">© {new Date().getFullYear()} CV Builder</footer>
    </div>
  )
}
