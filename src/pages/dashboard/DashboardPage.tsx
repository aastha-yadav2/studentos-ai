import { motion } from "framer-motion"
import {
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  Clock3,
  Code2,
  Flame,
  GraduationCap,
  NotebookPen,
  Rocket,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DashboardCard } from "@/components/dashboard/dashboard-card"
import { cn } from "@/lib/utils"

const todayFocus = [
  { title: "Finish DSA dynamic programming revision", domain: "Academics", time: "90 min", priority: "Critical", icon: GraduationCap },
  { title: "Apply to 3 backend internship roles", domain: "Career", time: "45 min", priority: "High", icon: BriefcaseBusiness },
  { title: "Ship auth flow for portfolio AI project", domain: "Project", time: "2 hrs", priority: "High", icon: Code2 },
]

const deadlines = [
  { title: "Operating Systems assignment", due: "Tomorrow", urgency: "urgent", meta: "11:59 PM" },
  { title: "DSA midterm", due: "In 4 days", urgency: "high", meta: "Chapters 6-9" },
  { title: "Hackathon demo submission", due: "Sunday", urgency: "medium", meta: "MVP + pitch deck" },
  { title: "Stripe internship application", due: "Jul 24", urgency: "normal", meta: "Resume tailored" },
]

const goals = [
  { title: "Land SWE internship", progress: 42, label: "8 / 20 applications", icon: BriefcaseBusiness },
  { title: "Score 85+ in DSA", progress: 68, label: "Revision on track", icon: GraduationCap },
  { title: "Launch AI portfolio project", progress: 55, label: "MVP in progress", icon: Rocket },
]

const recommendations = [
  { title: "Protect a 2-hour deep work block tonight", detail: "Your OS assignment and DSA revision compete for attention. Do DSA first while energy is highest.", icon: Sparkles },
  { title: "Batch internship applications", detail: "Apply to 3 similar backend roles together to reuse tailored bullets and reduce context switching.", icon: Zap },
  { title: "Cut one hackathon nice-to-have", detail: "The Project Agent recommends postponing analytics until after the judging demo.", icon: Target },
]

const weeklyPlan = [
  { day: "Thu", focus: "DSA revision + backend applications", load: "Heavy" },
  { day: "Fri", focus: "OS assignment final pass", load: "Medium" },
  { day: "Sat", focus: "Hackathon MVP build sprint", load: "Heavy" },
  { day: "Sun", focus: "Demo polish + pitch rehearsal", load: "Medium" },
  { day: "Mon", focus: "DSA mock test + review", load: "Light" },
]

const recentActivity = [
  "Completed 12 graph problems",
  "Career Agent drafted internship outreach checklist",
  "Moved portfolio project API milestone to in progress",
  "Planner Agent recalibrated weekly priorities",
]

const agents = [
  { name: "Planner Agent", status: "Orchestrating", action: "Balanced exam prep against internship goals", icon: Bot, tone: "text-primary" },
  { name: "Study Agent", status: "Monitoring", action: "Flagged DSA as highest academic risk", icon: NotebookPen, tone: "text-sky-300" },
  { name: "Career Agent", status: "Preparing", action: "Queued 3 backend internship applications", icon: BriefcaseBusiness, tone: "text-emerald-300" },
  { name: "Project Agent", status: "Scoping", action: "Reduced MVP to auth, dashboard, and agent trace", icon: Code2, tone: "text-amber-300" },
]

const urgencyStyles: Record<string, string> = {
  urgent: "bg-red-500/15 text-red-300 ring-red-500/20",
  high: "bg-amber-500/15 text-amber-200 ring-amber-500/20",
  medium: "bg-sky-500/15 text-sky-200 ring-sky-500/20",
  normal: "bg-emerald-500/15 text-emerald-200 ring-emerald-500/20",
}

function getFormattedDate() {
  return new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date())
}

function ProductivityScore() {
  const score = 82
  const circumference = 2 * Math.PI * 44
  const offset = circumference - (score / 100) * circumference

  return (
    <DashboardCard delay={0.24} className="overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Productivity Score</p>
          <h2 className="mt-1 text-xl font-semibold">Strong momentum</h2>
        </div>
        <Badge>Live</Badge>
      </div>
      <div className="mt-6 flex items-center justify-center">
        <div className="relative size-40">
          <svg className="size-40 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" className="fill-none stroke-muted" strokeWidth="8" />
            <motion.circle
              cx="50"
              cy="50"
              r="44"
              className="fill-none stroke-primary"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1.1, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-semibold tracking-tight">{score}</span>
            <span className="text-xs uppercase tracking-[0.22em] text-muted-foreground">score</span>
          </div>
        </div>
      </div>
      <p className="mt-5 text-center text-sm leading-6 text-muted-foreground">You are on pace, but today has two critical blocks. Keep context switching low.</p>
    </DashboardCard>
  )
}

function AgentActivity() {
  return (
    <DashboardCard delay={0.28} className="xl:sticky xl:top-24">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Agent Activity</p>
          <h2 className="mt-1 text-xl font-semibold">Specialists online</h2>
        </div>
        <span className="relative flex size-3">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex size-3 rounded-full bg-emerald-400" />
        </span>
      </div>
      <div className="space-y-3">
        {agents.map((agent, index) => (
          <motion.div
            key={agent.name}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.34 + index * 0.06 }}
            className="rounded-2xl border border-border/70 bg-muted/25 p-4"
          >
            <div className="flex items-start gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-background/80">
                <agent.icon className={cn("size-5", agent.tone)} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{agent.name}</p>
                  <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,.8)]" />
                </div>
                <p className="mt-1 text-xs text-primary">{agent.status}</p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{agent.action}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </DashboardCard>
  )
}

export function DashboardPage() {
  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <DashboardCard className="relative overflow-hidden p-6 sm:p-7">
          <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Badge>Career + Study Command Center</Badge>
              <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-5xl">Good evening, Aarav.</h1>
              <p className="mt-3 text-base text-muted-foreground sm:text-lg">{getFormattedDate()} · Your Planner Agent found 3 priorities that protect your exam score and internship momentum.</p>
            </div>
            <Button size="lg" className="w-full sm:w-auto"><Sparkles className="size-4" /> Ask Planner</Button>
          </div>
        </DashboardCard>
        <DashboardCard delay={0.08} className="bg-gradient-to-br from-primary/15 via-card to-card">
          <div className="flex items-center gap-2 text-sm text-primary"><Flame className="size-4" /> AI Daily Brief</div>
          <p className="mt-4 text-lg font-medium leading-8">Your day is execution-heavy. Complete DSA revision before applications, then reserve the final block for the portfolio auth milestone.</p>
          <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground"><Clock3 className="size-4" /> Estimated focused work: 4h 15m</div>
        </DashboardCard>
      </motion.div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <DashboardCard delay={0.1}>
              <div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-semibold">Today&apos;s Focus</h2><Badge>3 tasks</Badge></div>
              <div className="space-y-3">
                {todayFocus.map((task) => (
                  <div key={task.title} className="group rounded-2xl border border-border/70 bg-muted/25 p-4 transition-colors hover:bg-muted/40">
                    <div className="flex gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-background"><task.icon className="size-5 text-primary" /></div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2"><p className="font-medium">{task.title}</p><span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">{task.priority}</span></div>
                        <p className="mt-2 text-sm text-muted-foreground">{task.domain} · {task.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </DashboardCard>

            <DashboardCard delay={0.14}>
              <div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-semibold">Upcoming Deadlines</h2><CalendarClock className="size-5 text-muted-foreground" /></div>
              <div className="space-y-3">
                {deadlines.map((deadline) => (
                  <div key={deadline.title} className="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-muted/25 p-4">
                    <div>
                      <p className="font-medium">{deadline.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{deadline.meta}</p>
                    </div>
                    <span className={cn("shrink-0 rounded-full px-3 py-1 text-xs ring-1", urgencyStyles[deadline.urgency])}>{deadline.due}</span>
                  </div>
                ))}
              </div>
            </DashboardCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {goals.map((goal, index) => (
              <DashboardCard key={goal.title} delay={0.16 + index * 0.04}>
                <div className="flex items-center justify-between"><goal.icon className="size-5 text-primary" /><span className="text-sm font-medium">{goal.progress}%</span></div>
                <h3 className="mt-5 font-semibold">{goal.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{goal.label}</p>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${goal.progress}%` }} transition={{ duration: 0.9, delay: 0.2 }} className="h-full rounded-full bg-primary" />
                </div>
              </DashboardCard>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
            <DashboardCard delay={0.2}>
              <div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-semibold">AI Recommendations</h2><Sparkles className="size-5 text-primary" /></div>
              <div className="space-y-3">
                {recommendations.map((item) => (
                  <div key={item.title} className="rounded-2xl border border-border/70 bg-muted/25 p-4">
                    <div className="flex gap-3"><item.icon className="mt-1 size-5 shrink-0 text-primary" /><div><p className="font-medium">{item.title}</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{item.detail}</p></div></div>
                  </div>
                ))}
              </div>
            </DashboardCard>

            <ProductivityScore />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <DashboardCard delay={0.28}>
              <div className="mb-6 flex items-center justify-between"><h2 className="text-xl font-semibold">Weekly Execution Plan</h2><TrendingUp className="size-5 text-muted-foreground" /></div>
              <div className="space-y-4">
                {weeklyPlan.map((item) => (
                  <div key={item.day} className="grid grid-cols-[44px_1fr_auto] items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-muted text-sm font-semibold">{item.day}</div>
                    <div className="min-w-0"><p className="truncate text-sm font-medium">{item.focus}</p><div className="mt-2 h-px bg-border" /></div>
                    <span className="text-xs text-muted-foreground">{item.load}</span>
                  </div>
                ))}
              </div>
            </DashboardCard>

            <DashboardCard delay={0.32}>
              <div className="mb-6 flex items-center justify-between"><h2 className="text-xl font-semibold">Recent Activity</h2><CheckCircle2 className="size-5 text-emerald-300" /></div>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={activity} className="flex gap-3">
                    <div className="flex flex-col items-center"><CircleDot className="size-4 text-primary" />{index < recentActivity.length - 1 && <div className="mt-2 h-8 w-px bg-border" />}</div>
                    <p className="text-sm leading-6 text-muted-foreground">{activity}</p>
                  </div>
                ))}
              </div>
            </DashboardCard>
          </div>
        </div>

        <aside className="space-y-6">
          <AgentActivity />
          <DashboardCard delay={0.36}>
            <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Next best action</h2><ArrowRight className="size-5 text-primary" /></div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Start the DSA revision block now. The Planner Agent estimates this has the highest leverage on your week.</p>
          </DashboardCard>
        </aside>
      </div>
    </div>
  )
}
