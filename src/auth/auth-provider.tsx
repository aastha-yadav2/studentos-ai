import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import type { Session, User } from "@supabase/supabase-js"
import { supabase, supabaseConfigError } from "@/lib/supabase"
import { isAuthBypassEnabled } from "@/auth/auth-config"

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

const developmentUser = {
  id: "00000000-0000-4000-8000-000000000001",
  aud: "authenticated",
  role: "authenticated",
  email: "developer@studentos.local",
  app_metadata: {},
  user_metadata: { name: "Development User" },
  created_at: "2026-01-01T00:00:00.000Z",
} as User

const developmentSession = {
  access_token: import.meta.env.VITE_SUPABASE_ANON_KEY ?? "development-bypass",
  token_type: "bearer",
  expires_in: 60 * 60,
  expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
  refresh_token: "development-bypass",
  user: developmentUser,
} as Session

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(isAuthBypassEnabled ? developmentSession : null)
  const [loading, setLoading] = useState(!isAuthBypassEnabled && Boolean(supabase))

  useEffect(() => {
    if (isAuthBypassEnabled) return
    if (!supabase) return

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
    configurationError: isAuthBypassEnabled ? null : supabaseConfigError,
    async signIn({ email, password }) {
      if (isAuthBypassEnabled) return { error: null }
      if (!supabase) return { error: supabaseConfigError }
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return { error: error?.message ?? null }
    },
    async signUp({ email, password }) {
      if (isAuthBypassEnabled) return { error: null, needsEmailConfirmation: false }
      if (!supabase) return { error: supabaseConfigError, needsEmailConfirmation: false }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth` },
      })
      return { error: error?.message ?? null, needsEmailConfirmation: !data.session && !error }
    },
    async signInWithGoogle() {
      if (isAuthBypassEnabled) return { error: null }
      if (!supabase) return { error: supabaseConfigError }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/app` },
      })
      return { error: error?.message ?? null }
    },
    async signOut() {
      if (isAuthBypassEnabled) return { error: null }
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
