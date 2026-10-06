import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isLocalMode } from '../lib/supabase'

const AuthContext = createContext(null)

const LOCAL_USER = { id: 'local', email: 'demo@local' }

export function AuthProvider({ children }) {
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

  const value = {
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
        options: { emailRedirectTo: `${window.location.origin}/app` },
      })
      if (error) throw error
      // When email confirmation is enabled there is no session yet.
      return { needsConfirmation: !data.session }
    },
    async sendMagicLink(email) {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/app` },
      })
      if (error) throw error
    },
    async signOut() {
      if (!isLocalMode) await supabase.auth.signOut()
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
