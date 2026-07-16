import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface PageShellProps {
  eyebrow: string
  title: string
  description: string
}

export function PageShell({ eyebrow, title, description }: PageShellProps) {
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="mx-auto max-w-7xl space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">{eyebrow}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">{description}</p>
      </div>
      <Card className="min-h-[420px] border-dashed">
        <CardHeader>
          <CardTitle>Coming next</CardTitle>
          <CardDescription>This placeholder reserves the page contract while backend and feature modules are implemented.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex min-h-64 items-center justify-center rounded-2xl border border-border/70 bg-grid bg-muted/20 text-center">
            <div>
              <p className="text-lg font-medium">Production-ready shell in place</p>
              <p className="mt-2 text-sm text-muted-foreground">Page-specific content will be added in the next iteration.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.section>
  )
}
