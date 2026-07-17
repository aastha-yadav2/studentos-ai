/**
 * Local-only development switch for working on the app without signing in.
 * It is on in Vite development by default. Set VITE_AUTH_BYPASS=false to restore
 * Supabase auth locally, or true to force the bypass in another environment.
 */
export const isAuthBypassEnabled = import.meta.env.VITE_AUTH_BYPASS === "true"
  || (import.meta.env.DEV && import.meta.env.VITE_AUTH_BYPASS !== "false")
