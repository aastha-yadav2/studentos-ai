import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import type { Session, User } from "@supabase/supabase-js"
import { supabase, supabaseConfigError } from "@/lib/supabase"

type Credentials = { email: string; password: string }

type AuthContextValue = {
  session: Session | null
  user: User | null
  loading: boolean
  configurationError: string | null
  signIn: (credentials: Credentials) => Promise<{ error: string | null }>
  signUp: (credentials: Credentials) => Promise<{ error: string | null; needsEmailConfirmation: boolean }>
  signInWithGoogle: () => Promise<{ error: string | null }>
  signOut: () => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    let mounted = true
    supabase.auth.getSession().then(({ data, error }) => {
      if (mounted) {
        setSession(error ? null : data.session)
        setLoading(false)
      }
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    loading,
    configurationError: supabaseConfigError,
    async signIn({ email, password }) {
      if (!supabase) return { error: supabaseConfigError }
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return { error: error?.message ?? null }
    },
    async signUp({ email, password }) {
      if (!supabase) return { error: supabaseConfigError, needsEmailConfirmation: false }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth` },
      })
      return { error: error?.message ?? null, needsEmailConfirmation: !data.session && !error }
    },
    async signInWithGoogle() {
      if (!supabase) return { error: supabaseConfigError }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/app` },
      })
      return { error: error?.message ?? null }
    },
    async signOut() {
      if (!supabase) return { error: supabaseConfigError }
      const { error } = await supabase.auth.signOut()
      return { error: error?.message ?? null }
    },
  }), [loading, session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within AuthProvider")
  return context
}
