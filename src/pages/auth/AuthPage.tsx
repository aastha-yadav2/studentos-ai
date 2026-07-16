import { Link } from "react-router-dom"
import { GraduationCap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function AuthPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background bg-grid p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-glow"><GraduationCap /></div>
          <CardTitle>Welcome to StudentOS AI</CardTitle>
          <CardDescription>Authentication UI shell. Supabase Auth will be wired in the backend integration sprint.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button className="w-full" asChild><Link to="/onboarding">Continue to onboarding</Link></Button>
          <Button className="w-full" variant="secondary" asChild><Link to="/app">Preview dashboard shell</Link></Button>
        </CardContent>
      </Card>
    </main>
  )
}
