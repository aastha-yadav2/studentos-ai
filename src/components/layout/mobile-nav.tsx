import { NavLink } from "react-router-dom"
import { appRoutes } from "@/lib/routes"
import { cn } from "@/lib/utils"

export function MobileNav() {
  return (
    <nav className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-6 rounded-2xl border border-border bg-background/90 p-1 shadow-2xl backdrop-blur-xl lg:hidden">
      {appRoutes.map((item) => (
        <NavLink
          key={item.href}
          to={item.href}
          end={item.href === "/app"}
          className={({ isActive }) => cn("flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] transition-colors", isActive ? "bg-muted text-foreground" : "text-muted-foreground")}
          aria-label={item.title}
        >
          <item.icon className="size-4" />
          <span className="hidden sm:inline">{item.title}</span>
        </NavLink>
      ))}
    </nav>
  )
}
