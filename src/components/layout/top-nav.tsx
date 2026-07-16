import { Menu, Search, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function TopNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/70 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="lg:hidden"><Menu className="size-4" /></Button>
        <div className="relative hidden flex-1 sm:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="max-w-xl pl-9" placeholder="Search tasks, goals, plans, agents..." />
        </div>
        <Button variant="secondary" className="ml-auto"><Sparkles className="size-4" /> Ask Planner</Button>
        <div className="flex size-10 items-center justify-center rounded-full border border-border bg-muted text-sm font-semibold">SO</div>
      </div>
    </header>
  )
}
