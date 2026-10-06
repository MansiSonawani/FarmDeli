import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import Logo from '../components/Logo'
import { Button, TextInput, cx } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { isLocalMode } from '../lib/supabase'

export default function Login() {
  const { user, signIn, signUp, sendMagicLink } = useAuth()
  const location = useLocation()
  const [mode, setMode] = useState(location.pathname === '/signup' ? 'signup' : 'signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(null)

  if (user || isLocalMode) return <Navigate to="/app" replace />

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <Link to="/" className="mb-8">
        <Logo />
      </Link>
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {sent ? (
          <div className="py-4 text-center">
            <MailCheck className="mx-auto size-10 text-indigo-600" />
            <h1 className="mt-4 text-lg font-semibold text-slate-900">Check your inbox</h1>
            <p className="mt-1 text-sm text-slate-500">
              {sent === 'magic' ? 'We sent you a sign-in link' : 'We sent you a confirmation link'} at <strong>{email}</strong>.
            </p>
            <button type="button" className="mt-6 text-sm font-medium text-indigo-600 hover:underline" onClick={() => setSent(null)}>
              Back
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold text-slate-900">{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h1>
            <p className="mt-1 text-sm text-slate-500">{mode === 'signup' ? 'Free forever. No credit card needed.' : 'Sign in to edit your resumes.'}</p>

            <div className="mt-5 flex rounded-lg bg-slate-100 p-1 text-sm">
              {[
                ['signin', 'Sign in'],
                ['signup', 'Sign up'],
                ['magic', 'Email link'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setMode(value)
                    setError('')
                  }}
                  className={cx('flex-1 rounded-md py-1.5 font-medium', mode === value ? 'bg-white shadow-sm' : 'text-slate-500')}
                >
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="mt-5 space-y-4">
              <TextInput label="Email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
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
              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
              <Button type="submit" className="w-full" loading={busy}>
                {mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send me a link'}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
