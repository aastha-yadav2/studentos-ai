import { useMemo, useState } from "react"
import { AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, Circle, Clock3, Loader2, Sparkles, Target } from "lucide-react"
import { supabase, supabaseConfigError } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type Plan = {
  title: string
  summary: string
  estimated_total_hours: number
  weekly_milestones: { week: string; objective: string; deliverables: string[]; estimated_hours: number }[]
  daily_tasks: { day: string; task: string; priority: "High" | "Medium" | "Low"; estimated_hours: number }[]
  risks: { risk: string; mitigation: string }[]
  recommendations: string[]
}

const goalTypes = ["Exam prep", "Internship", "Hackathon", "Project"]
const starterGoals = [
  "Prepare for my algorithms final in six weeks",
  "Land a frontend internship this semester",
  "Build an AI study companion for a hackathon",
]

function parsePlan(value: string): Plan | null {
  try {
    const plan = JSON.parse(value) as Plan
    return plan?.title && Array.isArray(plan.weekly_milestones) ? plan : null
  } catch { return null }
}

export function PlannerPage() {
  const [goal, setGoal] = useState("")
  const [type, setType] = useState("Exam prep")
  const [timeframe, setTimeframe] = useState("6 weeks")
  const [hours, setHours] = useState("10")
  const [response, setResponse] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const plan = useMemo(() => parsePlan(response), [response])

  async function generatePlan() {
    if (!goal.trim()) { setError("Describe the outcome you want to achieve first."); return }
    if (!supabase) { setError(supabaseConfigError); return }
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setError("Your session has expired. Please sign in again."); return }
    setLoading(true); setError(null); setResponse("")
    try {
      const result = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/planner-stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ goal: goal.trim(), goalType: type, timeframe, weeklyHours: Number(hours) || 10 }),
      })
      if (!result.ok || !result.body) throw new Error((await result.json().catch(() => null))?.error ?? "Unable to start the Planner Agent.")
      const reader = result.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let output = ""
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split("\n\n")
        buffer = events.pop() ?? ""
        for (const event of events) {
          const data = event.split("\n").find((line) => line.startsWith("data:"))?.slice(5).trim()
          if (!data || data === "[DONE]") continue
          const message = JSON.parse(data) as { type?: string; delta?: string; error?: { message?: string } }
          if (message.type === "response.output_text.delta" && message.delta) { output += message.delta; setResponse(output) }
          if (message.type === "error") throw new Error(message.error?.message ?? "The model could not generate a plan.")
        }
      }
      const completedPlan = parsePlan(output)
      if (completedPlan) {
        await Promise.all([
          supabase.from("planner_runs").insert({ user_id: session.user.id, title: completedPlan.title, goal: goal.trim(), goal_type: type, plan: completedPlan }),
          supabase.from("ai_recommendations").insert(completedPlan.recommendations.map((content) => ({ user_id: session.user.id, content, source: "Planner" }))),
          supabase.from("activity_events").insert({ user_id: session.user.id, event_type: "plan_generated", description: `Generated a ${type.toLowerCase()} plan: ${completedPlan.title}` }),
        ])
      }
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.") }
    finally { setLoading(false) }
  }

  return <div className="mx-auto max-w-7xl space-y-7 pb-8">
    <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-card p-6 shadow-2xl shadow-primary/5 sm:p-9">
      <div className="absolute -right-20 -top-24 size-72 rounded-full bg-primary/20 blur-3xl" />
      <div className="relative max-w-3xl"><Badge className="mb-4 bg-primary/15 text-primary hover:bg-primary/15"><Sparkles className="mr-1 size-3" /> Planner Agent</Badge><h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">Turn ambition into a <span className="text-primary">clear next move.</span></h1><p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">Tell the Planner what matters. It will build a realistic execution system with milestones, daily focus, capacity estimates, and guardrails.</p></div>
    </section>

    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,.92fr)]">
      <Card className="border-border/80 bg-card/80"><CardContent className="p-5 sm:p-7"><div className="mb-6 flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary"><Target className="size-4" /></span><div><h2 className="font-semibold">What are you working toward?</h2><p className="text-sm text-muted-foreground">Give context, constraints, and the definition of done.</p></div></div>
        <div className="space-y-5"><div className="flex flex-wrap gap-2">{goalTypes.map((item) => <button key={item} type="button" onClick={() => setType(item)} className={`rounded-full border px-3 py-1.5 text-sm transition ${type === item ? "border-primary/50 bg-primary/15 text-primary" : "border-border bg-muted/30 text-muted-foreground hover:bg-muted"}`}>{item}</button>)}</div>
          <textarea value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="Example: I need to prepare for my data structures final on May 20. I can study on weekday evenings and need a B+ or better." className="min-h-40 w-full resize-y rounded-2xl border border-border bg-background/50 p-4 text-sm leading-6 outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/15" />
          <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-sm font-medium">Time available<input value={timeframe} onChange={(event) => setTimeframe(event.target.value)} className="h-11 w-full rounded-xl border bg-background/50 px-3 font-normal outline-none focus:border-primary/60" placeholder="e.g. 6 weeks" /></label><label className="space-y-2 text-sm font-medium">Hours per week<input value={hours} onChange={(event) => setHours(event.target.value)} type="number" min="1" max="80" className="h-11 w-full rounded-xl border bg-background/50 px-3 font-normal outline-none focus:border-primary/60" /></label></div>
          {error && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
          <Button size="lg" onClick={generatePlan} disabled={loading} className="w-full sm:w-auto">{loading ? <><Loader2 className="size-4 animate-spin" />Building your plan...</> : <><Sparkles className="size-4" />Generate execution plan<ArrowRight className="size-4" /></>}</Button>
        </div></CardContent></Card>

      <div className="space-y-4"><div className="rounded-2xl border border-border bg-muted/20 p-5"><p className="text-xs font-semibold uppercase tracking-[.18em] text-muted-foreground">Plan intelligence</p><div className="mt-4 grid grid-cols-2 gap-3"><Stat icon={<CalendarDays />} label="Weekly milestones" value="Sequenced" /><Stat icon={<Clock3 />} label="Capacity-aware" value={`${hours || 10} h / week`} /></div></div><div className="rounded-2xl border border-border bg-muted/20 p-5"><p className="mb-3 text-sm font-medium">Try a starting point</p>{starterGoals.map((item) => <button key={item} onClick={() => setGoal(item)} className="mb-2 w-full rounded-xl border border-border/70 bg-background/30 p-3 text-left text-sm text-muted-foreground transition hover:border-primary/40 hover:text-foreground">{item}</button>)}</div></div>
    </div>

    {(loading || response) && <section className="rounded-3xl border border-border bg-card/90 p-5 sm:p-7"><div className="mb-6 flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-primary">Generated execution plan</p><h2 className="mt-1 text-xl font-semibold">{plan?.title ?? "Planner is thinking"}</h2></div>{loading && <Badge className="animate-pulse bg-primary/15 text-primary">Streaming</Badge>}</div>
      {plan ? <PlanView plan={plan} /> : <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-2xl bg-background/60 p-4 text-sm leading-6 text-muted-foreground">{response || "Designing the right path for you..."}</pre>}
    </section>}
  </div>
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="rounded-xl border border-border/70 bg-background/40 p-3"><div className="mb-3 text-primary [&>svg]:size-4">{icon}</div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div> }

function PlanView({ plan }: { plan: Plan }) { return <div className="space-y-7"><div className="flex flex-wrap items-center gap-3"><Badge className="bg-primary/15 text-primary">{plan.estimated_total_hours} estimated hours</Badge><p className="max-w-3xl text-sm leading-6 text-muted-foreground">{plan.summary}</p></div><div><h3 className="mb-3 font-semibold">Weekly milestones</h3><div className="grid gap-3 lg:grid-cols-2">{plan.weekly_milestones.map((week) => <div key={week.week} className="rounded-2xl border border-border bg-muted/20 p-4"><div className="flex justify-between gap-3"><p className="font-medium">{week.week}</p><span className="text-xs text-primary">{week.estimated_hours}h</span></div><p className="mt-2 text-sm text-muted-foreground">{week.objective}</p><ul className="mt-3 space-y-1.5 text-sm">{week.deliverables.map((item) => <li key={item} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />{item}</li>)}</ul></div>)}</div></div><div><h3 className="mb-3 font-semibold">Daily focus</h3><div className="overflow-hidden rounded-2xl border border-border"><div className="grid grid-cols-[100px_minmax(0,1fr)_70px] gap-3 border-b bg-muted/30 px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground"><span>When</span><span>Task</span><span>Load</span></div>{plan.daily_tasks.map((task, index) => <div key={`${task.day}-${index}`} className="grid grid-cols-[100px_minmax(0,1fr)_70px] gap-3 border-b border-border/70 px-4 py-3 text-sm last:border-0"><span className="text-muted-foreground">{task.day}</span><span className="flex gap-2"><Circle className={`mt-1 size-3 shrink-0 ${task.priority === "High" ? "fill-primary text-primary" : "text-muted-foreground"}`} />{task.task}</span><span className="text-muted-foreground">{task.estimated_hours}h</span></div>)}</div></div><div className="grid gap-5 md:grid-cols-2"><div><h3 className="mb-3 font-semibold">Risks to manage</h3>{plan.risks.map((item) => <div key={item.risk} className="mb-2 rounded-xl border border-amber-300/15 bg-amber-300/5 p-3 text-sm"><p className="flex gap-2 font-medium text-amber-100"><AlertTriangle className="size-4 text-amber-300" />{item.risk}</p><p className="mt-1 pl-6 text-muted-foreground">{item.mitigation}</p></div>)}</div><div><h3 className="mb-3 font-semibold">Planner recommendations</h3>{plan.recommendations.map((item) => <p key={item} className="mb-2 flex gap-2 rounded-xl border border-border bg-muted/20 p-3 text-sm text-muted-foreground"><Sparkles className="size-4 shrink-0 text-primary" />{item}</p>)}</div></div></div> }
