import { useEffect, useMemo, useState } from 'react'
import { api, isLocalMode } from '../lib/api'
import { AuthContext } from './contexts'

const LOCAL_USER = { id: 'local', email: 'demo@local' }

export default function AuthProvider({ children }) {
  const [session, setSession] = useState(isLocalMode ? { user: LOCAL_USER } : null)
  const [loading, setLoading] = useState(!isLocalMode)

  useEffect(() => {
    if (isLocalMode) return
    api('/auth/me')
      .then(({ user }) => setSession(user ? { user } : null))
      .catch(() => setSession(null))
      .finally(() => setLoading(false))
  }, [])

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      async signIn(email, password) {
        const { user } = await api('/auth/signin', { method: 'POST', body: { email, password } })
        setSession({ user })
      },
      async signUp(email, password) {
        const { user } = await api('/auth/signup', { method: 'POST', body: { email, password } })
        setSession({ user })
      },
      async signOut() {
        if (!isLocalMode) await api('/auth/signout', { method: 'POST' })
        setSession(null)
      },
    }),
    [session, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
