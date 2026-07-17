import { LogOut, Menu, Search, Sparkles } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/auth/auth-provider"

export function TopNav() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [isSigningOut, setIsSigningOut] = useState(false)

  async function handleSignOut() {
    setIsSigningOut(true)
    const { error } = await signOut()
    setIsSigningOut(false)
    if (!error) navigate("/auth", { replace: true })
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/70 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="lg:hidden"><Menu className="size-4" /></Button>
        <div className="relative hidden flex-1 sm:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="max-w-xl pl-9" placeholder="Search tasks, goals, plans, agents..." />
        </div>
        <Button variant="secondary" className="ml-auto"><Sparkles className="size-4" /> Ask Planner</Button>
        <div className="hidden max-w-40 truncate text-right text-xs text-muted-foreground md:block">{user?.email}</div>
        <Button variant="ghost" size="sm" onClick={handleSignOut} disabled={isSigningOut} aria-label="Sign out"><LogOut className="size-4" /><span className="hidden sm:inline">Sign out</span></Button>
        <div className="flex size-10 items-center justify-center rounded-full border border-border bg-muted text-sm font-semibold">{user?.email?.slice(0, 2).toUpperCase() ?? "SO"}</div>
      </div>
    </header>
  )
}
