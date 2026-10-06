import { useMemo, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, MailCheck } from 'lucide-react'
import Logo from '../components/Logo'
import MaskedLines from '../components/motion/MaskedLines'
import ResumeThumbnail from '../components/resume/ResumeThumbnail'
import { Button, Segmented, TextInput } from '../components/ui'
import { useAuth } from '../hooks/useAuth'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { sampleResume } from '../lib/defaults'
import { EASE_OUT } from '../lib/motion'
import { isLocalMode } from '../lib/supabase'
import { templateStyle } from '../lib/templates'

const COPY = {
  signin: ['Welcome back.', 'Sign in to keep editing your resumes.', 'Sign in'],
  signup: ['Create your account.', 'Free forever. No credit card.', 'Create account'],
  magic: ['Sign in by email.', 'We will send you a one-time sign-in link.', 'Send me a link'],
}

export default function Login() {
  const { user, signIn, signUp, sendMagicLink } = useAuth()
  const location = useLocation()
  const [mode, setMode] = useState(location.pathname === '/signup' ? 'signup' : 'signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(null)
  const sample = useMemo(() => sampleResume(), [])
  useDocumentTitle(mode === 'signup' ? 'Create account' : 'Sign in')

  if (user || isLocalMode) return <Navigate to="/app" replace />

  const [title, subtitle, action] = COPY[mode]

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'signin') await signIn(email, password)
      else if (mode === 'signup') {
        const { needsConfirmation } = await signUp(email, password)
        if (needsConfirmation) setSent('confirm')
      } else {
        await sendMagicLink(email)
        setSent('magic')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-6 py-6 sm:px-10">
        <Link to="/" className="self-start" aria-label="CV Builder home">
          <Logo />
        </Link>
        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div
                key="sent"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: EASE_OUT }}
              >
                <MailCheck className="size-9 text-accent" />
                <h1 className="mt-6 text-4xl font-medium tracking-tight">Check your inbox.</h1>
                <p className="mt-3 text-ink-2">
                  {sent === 'magic' ? 'We sent a sign-in link' : 'We sent a confirmation link'} to{' '}
                  <strong>{email}</strong>.
                </p>
                <button type="button" className="link-underline mt-8 text-sm font-medium" onClick={() => setSent(null)}>
                  Use a different email
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: EASE_OUT }}
              >
                <h1 className="text-4xl font-medium tracking-[-0.03em] sm:text-5xl">{title}</h1>
                <p className="mt-3 text-ink-2">{subtitle}</p>
                <div className="mt-8">
                  <Segmented
                    value={mode}
                    onChange={(value) => {
                      setMode(value)
                      setError('')
                    }}
                    options={[
                      ['signin', 'Sign in'],
                      ['signup', 'Sign up'],
                      ['magic', 'Email link'],
                    ]}
                  />
                </div>
                <form onSubmit={submit} className="mt-6 space-y-4">
                  <TextInput
                    label="Email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  {mode !== 'magic' && (
                    <TextInput
                      label="Password"
                      type="password"
                      required
                      minLength={6}
                      autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  )}
                  {error && (
                    <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                      {error}
                    </p>
                  )}
                  <Button type="submit" size="lg" className="group w-full" loading={busy}>
                    {action}
                    <ArrowRight className="size-4 transition-transform duration-500 group-hover:translate-x-1" />
                  </Button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
        <p className="eyebrow">© {new Date().getFullYear()} CV Builder</p>
      </div>

      <aside
        className="relative hidden overflow-hidden bg-ink p-12 text-paper lg:flex lg:flex-col lg:justify-between"
        aria-hidden="true"
      >
        <MaskedLines
          as="p"
          trigger="mount"
          delay={0.2}
          className="max-w-md text-6xl leading-[0.95] font-medium tracking-[-0.045em]"
          lines={[
            'Every great',
            'job starts',
            <>
              with a <span className="font-serif font-normal text-accent italic">page.</span>
            </>,
          ]}
        />
        <motion.div
          className="absolute -right-16 -bottom-24 w-[26rem] overflow-hidden rounded-[6px] shadow-2xl"
          initial={{ opacity: 0, y: 120, rotate: 0 }}
          animate={{ opacity: 1, y: 0, rotate: -8 }}
          transition={{ duration: 1.4, ease: EASE_OUT, delay: 0.3 }}
        >
          <ResumeThumbnail data={sample} style={templateStyle('modern')} />
        </motion.div>
        <p className="eyebrow relative text-paper/50">Free · No watermarks · ATS-friendly</p>
      </aside>
    </div>
  )
}
