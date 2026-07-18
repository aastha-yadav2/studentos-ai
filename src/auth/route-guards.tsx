import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuth } from "@/auth/auth-provider"

function LoadingScreen() {
  return <main className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">Restoring your session…</main>
}

export function ProtectedRoute() {
  const { session, loading } = useAuth()
  const location = useLocation()
  if (loading) return <LoadingScreen />
  if (!session) return <Navigate to="/auth" replace state={{ from: location.pathname }} />
  return <Outlet />
}

export function PublicOnlyRoute() {
  const { session, loading } = useAuth()
  if (loading) return <LoadingScreen />
  return session ? <Navigate to="/app" replace /> : <Outlet />
}
