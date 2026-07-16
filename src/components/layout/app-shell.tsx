import { Outlet } from "react-router-dom"
import { Sidebar } from "./sidebar"
import { TopNav } from "./top-nav"
import { MobileNav } from "./mobile-nav"

export function AppShell() {
  return (
    <div className="min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,.22),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(56,189,248,.14),transparent_30%)]" />
      <div className="relative flex min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col lg:pl-72">
          <TopNav />
          <main className="flex-1 px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:pb-6">
            <Outlet />
          </main>
          <MobileNav />
        </div>
      </div>
    </div>
  )
}
