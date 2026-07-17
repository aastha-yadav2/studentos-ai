import { ArrowRight, BookOpen, BriefcaseBusiness, CheckSquare, Goal, Sparkles } from "lucide-react"
import { Link } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

const agents = [
  { name: "Planner Agent", description: "Turns a goal into an execution plan with milestones and daily focus.", icon: Sparkles, href: "/app/planner", status: "Ready" },
  { name: "Study Agent", description: "Balances exam dates, confidence, and available time into a revision schedule.", icon: BookOpen, href: "/app/study", status: "Ready" },
  { name: "Career Agent", description: "Builds placement roadmaps with projects, resources, and application strategy.", icon: BriefcaseBusiness, href: "/app/career", status: "Ready" },
  { name: "Goal Agent", description: "Suggests practical next steps from progress and milestone context.", icon: Goal, href: "/app/goals", status: "Ready" },
  { name: "Task Manager", description: "Keeps the execution layer organized, prioritized, and in sync.", icon: CheckSquare, href: "/app/tasks", status: "Ready" },
]

export function AgentsPage() {
  return <section className="mx-auto max-w-6xl space-y-6 pb-8"><div><p className="text-sm font-medium uppercase tracking-[.25em] text-primary">Agent network</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Specialists for each part of your work.</h1><p className="mt-2 max-w-3xl text-muted-foreground">Each agent works from the context you provide and saves useful outputs back to your StudentOS workspace.</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{agents.map((agent) => <Link key={agent.name} to={agent.href} className="group rounded-2xl focus-visible:outline-none"><Card className="h-full group-hover:border-primary/40 group-hover:shadow-glow"><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary"><agent.icon className="size-5" /></span><Badge>{agent.status}</Badge></div><h2 className="mt-5 font-semibold">{agent.name}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{agent.description}</p><p className="mt-5 flex items-center gap-1 text-sm font-medium text-primary">Open agent <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></p></CardContent></Card></Link>)}</div></section>
}
