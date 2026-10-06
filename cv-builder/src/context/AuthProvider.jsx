import { useEffect, useMemo, useState } from 'react'
import { supabase, isLocalMode } from '../lib/supabase'
import { AuthContext } from './contexts'

const LOCAL_USER = { id: 'local', email: 'demo@local' }

export default function AuthProvider({ children }) {
  const [session, setSession] = useState(isLocalMode ? { user: LOCAL_USER } : null)
  const [loading, setLoading] = useState(!isLocalMode)

  useEffect(() => {
    if (isLocalMode) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => listener.subscription.unsubscribe()
  }, [])

  const value = useMemo(() => {
    const redirect = () => `${window.location.origin}/app`
    return {
      session,
      user: session?.user ?? null,
      loading,
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      },
      async signUp(email, password) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirect() },
        })
        if (error) throw error
        // With email confirmation enabled there is no session until the link is clicked.
        return { needsConfirmation: !data.session }
      },
      async sendMagicLink(email) {
        const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect() } })
        if (error) throw error
      },
      async signOut() {
        if (!isLocalMode) await supabase.auth.signOut()
      },
    }
  }, [session, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
