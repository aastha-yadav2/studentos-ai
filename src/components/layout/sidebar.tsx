import { Link, NavLink } from "react-router-dom"
import { Command, GraduationCap } from "lucide-react"
import { appRoutes } from "@/lib/routes"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-border/80 bg-background/75 p-4 backdrop-blur-xl lg:flex lg:flex-col">
      <Link to="/app" className="mb-8 flex items-center gap-3 rounded-2xl px-2 py-1.5">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-glow">
          <GraduationCap className="size-5" />
        </div>
        <div>
          <p className="font-semibold tracking-tight">StudentOS AI</p>
          <p className="text-xs text-muted-foreground">Command Center</p>
        </div>
      </Link>
      <nav aria-label="Primary navigation" className="space-y-1">
        {appRoutes.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href === "/app"}
            className={({ isActive }) => cn("group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors", isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground")}
          >
            <item.icon className="size-4" />
            <span>{item.title}</span>
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto rounded-2xl border border-border bg-card/70 p-4">
        <div className="mb-3 flex items-center gap-2"><Command className="size-4 text-primary" /><Badge>Workspace</Badge></div>
        <p className="text-sm font-medium">Your planning system</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">Tasks, goals, and agents stay connected in one focused workspace.</p>
      </div>
    </aside>
  )
}
