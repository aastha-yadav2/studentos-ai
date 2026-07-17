import { AlertTriangle, RefreshCw } from "lucide-react"
import { isRouteErrorResponse, useRouteError } from "react-router-dom"
import { Button } from "@/components/ui/button"

export function AppErrorPage() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error) ? error.status === 404 ? "That page does not exist or may have moved." : error.statusText : "Something unexpected happened while loading this page."
  return <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground"><section className="w-full max-w-md rounded-3xl border border-border bg-card p-7 text-center shadow-2xl shadow-black/10"><AlertTriangle className="mx-auto size-8 text-primary" /><h1 className="mt-4 text-xl font-semibold">Unable to load StudentOS</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">{message}</p><Button className="mt-6" onClick={() => window.location.reload()}><RefreshCw className="size-4" />Try again</Button></section></main>
}
