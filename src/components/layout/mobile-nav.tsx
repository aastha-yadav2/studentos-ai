import { NavLink } from "react-router-dom"
import { appRoutes } from "@/lib/routes"
import { cn } from "@/lib/utils"

export function MobileNav() {
  return (
    <nav aria-label="Primary navigation" className="fixed inset-x-3 bottom-3 z-50 flex gap-1 overflow-x-auto rounded-2xl border border-border bg-background/90 p-1 shadow-2xl backdrop-blur-xl lg:hidden">
      {appRoutes.map((item) => (
        <NavLink
          key={item.href}
          to={item.href}
          end={item.href === "/app"}
          className={({ isActive }) => cn("flex min-w-14 flex-1 shrink-0 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] transition-colors", isActive ? "bg-muted text-foreground" : "text-muted-foreground")}
          aria-label={item.title}
        >
          <item.icon className="size-4" />
          <span>{item.title}</span>
        </NavLink>
      ))}
    </nav>
  )
}
