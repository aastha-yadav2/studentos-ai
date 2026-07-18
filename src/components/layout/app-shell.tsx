import { Outlet } from "react-router-dom"
import { Sidebar } from "./sidebar"
import { TopNav } from "./top-nav"
import { MobileNav } from "./mobile-nav"
import { OnboardingWalkthrough } from "@/components/demo/OnboardingWalkthrough"
import { useDemoMode } from "@/lib/demo/demoModeProvider"

export function AppShell() {
  const { enabled } = useDemoMode()
  return (
    <div className="min-h-screen overflow-hidden bg-background">
      <a href="#main-content" className="sr-only fixed left-4 top-4 z-[60] rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only">Skip to content</a>
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,.22),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(56,189,248,.14),transparent_30%)]" />
      <div className="relative flex min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col lg:pl-72">
          <TopNav />
          <main id="main-content" className="flex-1 px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:pb-6" tabIndex={-1}>
            {enabled && <div className="mb-4 flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-3 py-2 text-xs text-primary"><span className="size-2 animate-pulse rounded-full bg-primary" />Demo mode · all activity is private to this browser</div>}
            <Outlet />
          </main>
          <MobileNav />
        </div>
      </div>
      {enabled && <OnboardingWalkthrough />}
    </div>
  )
}
