import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuth } from "@/auth/auth-provider"
import { isAuthBypassEnabled } from "@/auth/auth-config"

function LoadingScreen() {
  return <main className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">Restoring your session…</main>
}

export function ProtectedRoute() {
  const { session, loading } = useAuth()
  const location = useLocation()
  if (isAuthBypassEnabled) return <Outlet />
  if (loading) return <LoadingScreen />
  if (!session) return <Navigate to="/auth" replace state={{ from: location.pathname }} />
  return <Outlet />
}

export function PublicOnlyRoute() {
  const { session, loading } = useAuth()
  if (isAuthBypassEnabled) return <Navigate to="/app" replace />
  if (loading) return <LoadingScreen />
  return session ? <Navigate to="/app" replace /> : <Outlet />
}
