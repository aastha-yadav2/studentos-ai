import { useMemo, useState } from "react"
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  BrainCircuit,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  FileText,
  FolderKanban,
  Gauge,
  GraduationCap,
  HelpCircle,
  Layers,
  Lightbulb,
  ListCheck,
  Loader2,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Target,
  Zap,
} from "lucide-react"
import { useAuth } from "@/auth/auth-provider"
import { supabase, supabaseConfigError } from "@/lib/supabase"
import { buildAIContext, buildCompactPlannerContext } from "@/lib/memory/contextBuilder"
import { plannerHistoryService } from "@/lib/memory/plannerHistoryService"
import { preferenceLearningService } from "@/lib/memory/preferenceLearningService"
import { adaptivePlanner } from "@/lib/adaptive/adaptivePlanner"
import { requestAI } from "@/lib/ai/router-client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export type Priority = "High" | "Medium" | "Low"

export type PracticeProgressionItem = {
  level: "Easy" | "Medium" | "Hard" | "Exam Level"
  goal: string
}

export type TopicMasteryGuide = {
  topic: string
  category: "DSA Pattern" | "Theory & Concepts" | "Core Skill" | "Revision"
  priority: Priority
  what_is_it: string
  why_it_works: string
  how_to_recognize: string
  remember_this: string[]
  common_traps: string[]
  complexity_notes?: string
  practice_progression: PracticeProgressionItem[]
  move_on_checklist: string[]
}

export type DailyTaskItem = {
  action: string
  type: "Teach/Learn" | "Practice" | "Recall" | "Revise" | "Test"
  estimated_minutes: number
  move_on_trigger?: string
}

export type OrchestratedPlan = {
  title: string
  goal_analysis: {
    objective: string
    scope: string
    preparation_mode: "Exam Mode (Theory + Dry Runs)" | "Interview/Coding Mode" | "Hybrid Academic Prep"
    yield_strategy: {
      high_priority_focus: string
      medium_priority_focus: string
      low_priority_optional: string
    }
    time_compressed_fallback: string
    module_coordination: {
      module: "Study" | "Career" | "Project" | "Productivity"
      role: string
      priority: Priority
    }[]
  }
  topic_mastery_guides?: TopicMasteryGuide[]
  weekly_roadmap: {
    week: string
    outcome: string
    deliverables: string[]
    estimated_hours: number
    move_on_checklist?: string[]
  }[]
  daily_execution_plan: {
    day: string
    focus: string
    tasks: DailyTaskItem[]
    estimated_hours: number
  }[]
  priority_matrix: {
    item: string
    impact: Priority
    urgency: Priority
    quadrant: string
    next_action: string
  }[]
  remember_this_notes?: {
    topic: string
    key_takeaway: string
    active_recall_prompt: string
  }[]
  common_mistakes_to_avoid?: string[]
  backup_plan_if_behind?: {
    trigger_condition: string
    actionable_compression_steps: string[]
  }
  estimated_effort: {
    total_hours: number
    weekly_hours: number
    allocation: { module: string; hours: number; rationale: string }[]
  }
  risks_and_blockers: { risk: string; mitigation: string }[]
  success_metrics: { metric: string; target: string; cadence: string }[]
  ai_reasoning: { rationale: string; tradeoffs: string[]; assumptions: string[] }
  recommendations: string[]
}

const goalTypes = ["Exam prep", "DSA & Coding", "Internship", "Hackathon", "Project"]
const starterGoals = [
  "How should I prepare DSA for my exams?",
  "Prepare for my algorithms final exam in 4 weeks",
  "Master core DSA patterns and land a software engineering internship",
  "Build and launch a full-stack AI project in 3 weeks",
]
const modules = [
  { name: "Study", icon: GraduationCap },
  { name: "Career", icon: BriefcaseBusiness },
  { name: "Project", icon: FolderKanban },
  { name: "Productivity", icon: Activity },
]

function normalizeTasks(tasks: unknown): DailyTaskItem[] {
  if (!Array.isArray(tasks)) return []
  return tasks.map((t) => {
    if (typeof t === "string") {
      let type: DailyTaskItem["type"] = "Practice"
      if (t.toLowerCase().includes("learn") || t.toLowerCase().includes("read")) type = "Teach/Learn"
      else if (t.toLowerCase().includes("recall") || t.toLowerCase().includes("quiz")) type = "Recall"
      else if (t.toLowerCase().includes("revise") || t.toLowerCase().includes("review")) type = "Revise"
      else if (t.toLowerCase().includes("test") || t.toLowerCase().includes("mock")) type = "Test"
      return { action: t, type, estimated_minutes: 45 }
    }
    if (typeof t === "object" && t !== null) {
      const rec = t as Record<string, unknown>
      return {
        action: String(rec.action || rec.title || rec.task || "Study item"),
        type: (rec.type as DailyTaskItem["type"]) || "Practice",
        estimated_minutes: Number(rec.estimated_minutes) || 45,
        move_on_trigger: rec.move_on_trigger ? String(rec.move_on_trigger) : undefined,
      }
    }
    return { action: String(t), type: "Practice", estimated_minutes: 45 }
  })
}

function parsePlan(value: string): OrchestratedPlan | null {
  try {
    const raw = JSON.parse(value) as Record<string, unknown>
    if (!raw || typeof raw !== "object" || !raw.title) return null

    const goalAnalysis = (raw.goal_analysis as Record<string, unknown>) || {}
    const weeklyRoadmap = Array.isArray(raw.weekly_roadmap) ? raw.weekly_roadmap : []
    const dailyPlanRaw = Array.isArray(raw.daily_execution_plan) ? raw.daily_execution_plan : []

    const dailyExecutionPlan = dailyPlanRaw.map((dayObj: any) => ({
      day: String(dayObj.day || "Day"),
      focus: String(dayObj.focus || "Daily Focus"),
      tasks: normalizeTasks(dayObj.tasks),
      estimated_hours: Number(dayObj.estimated_hours) || 2,
    }))

    const topicMastery = Array.isArray(raw.topic_mastery_guides)
      ? raw.topic_mastery_guides.map((tg: any) => ({
          topic: String(tg.topic || "Core Topic"),
          category: tg.category || "DSA Pattern",
          priority: (tg.priority as Priority) || "High",
          what_is_it: String(tg.what_is_it || ""),
          why_it_works: String(tg.why_it_works || ""),
          how_to_recognize: String(tg.how_to_recognize || ""),
          remember_this: Array.isArray(tg.remember_this) ? tg.remember_this.map(String) : [],
          common_traps: Array.isArray(tg.common_traps) ? tg.common_traps.map(String) : [],
          complexity_notes: tg.complexity_notes ? String(tg.complexity_notes) : undefined,
          practice_progression: Array.isArray(tg.practice_progression)
            ? tg.practice_progression.map((p: any) => ({ level: p.level || "Medium", goal: String(p.goal || "") }))
            : [],
          move_on_checklist: Array.isArray(tg.move_on_checklist) ? tg.move_on_checklist.map(String) : [],
        }))
      : undefined

    return {
      title: String(raw.title),
      goal_analysis: {
        objective: String(goalAnalysis.objective || "Target Goal"),
        scope: String(goalAnalysis.scope || "Plan Scope"),
        preparation_mode: (goalAnalysis.preparation_mode as any) || "Exam Mode (Theory + Dry Runs)",
        yield_strategy: (goalAnalysis.yield_strategy as any) || {
          high_priority_focus: "Focus on high-yield core concepts & top exam patterns first",
          medium_priority_focus: "Secondary topics after mastering high-priority fundamentals",
          low_priority_optional: "Optional/Advanced topics only if main syllabus is complete",
        },
        time_compressed_fallback: String(
          goalAnalysis.time_compressed_fallback ||
            "If short on time, skip edge case variations and master the top 3 high-yield patterns first."
        ),
        module_coordination: Array.isArray(goalAnalysis.module_coordination)
          ? goalAnalysis.module_coordination
          : [
              { module: "Study", role: "Primary concept learning & practice", priority: "High" },
              { module: "Productivity", role: "Daily task tracking and recall review", priority: "High" },
            ],
      },
      topic_mastery_guides: topicMastery,
      weekly_roadmap: weeklyRoadmap as any,
      daily_execution_plan: dailyExecutionPlan,
      priority_matrix: Array.isArray(raw.priority_matrix) ? (raw.priority_matrix as any) : [],
      remember_this_notes: Array.isArray(raw.remember_this_notes) ? (raw.remember_this_notes as any) : undefined,
      common_mistakes_to_avoid: Array.isArray(raw.common_mistakes_to_avoid)
        ? raw.common_mistakes_to_avoid.map(String)
        : undefined,
      backup_plan_if_behind: (raw.backup_plan_if_behind as any) || undefined,
      estimated_effort: (raw.estimated_effort as any) || { total_hours: 20, weekly_hours: 10, allocation: [] },
      risks_and_blockers: Array.isArray(raw.risks_and_blockers) ? (raw.risks_and_blockers as any) : [],
      success_metrics: Array.isArray(raw.success_metrics) ? (raw.success_metrics as any) : [],
      ai_reasoning: (raw.ai_reasoning as any) || { rationale: "Optimized for maximum retention and exam readiness", tradeoffs: [], assumptions: [] },
      recommendations: Array.isArray(raw.recommendations) ? raw.recommendations.map(String) : [],
    }
  } catch {
    return null
  }
}

export function PlannerPage() {
  const { session, user } = useAuth()
  const [goal, setGoal] = useState("")
  const [type, setType] = useState("Exam prep")
  const [timeframe, setTimeframe] = useState("4 weeks")
  const [hours, setHours] = useState("10")
  const [response, setResponse] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stage, setStage] = useState("Ready to build your mentor preparation plan")

  const plan = useMemo(() => parsePlan(response), [response])

  async function workspaceContext() {
    if (!user) return {}
    return await buildCompactPlannerContext(user.id)
  }

  async function generatePlan() {
    if (!goal.trim()) {
      setError("Describe the topic, exam, or goal you want to master first.")
      return
    }
    setLoading(true)
    setError(null)
    setResponse("")
    setStage("Analyzing goal and student profile context...")

    if (!supabase) {
      setError(supabaseConfigError)
      setLoading(false)
      return
    }
    if (!session || !user) {
      setError("Your session is unavailable. Please refresh and try again.")
      setLoading(false)
      return
    }

    try {
      const context = await workspaceContext()
      setStage("Crafting mentor-grade preparation & pattern mastery plan...")

      const result = await requestAI<{ content: string }>(session, "planner", {
        goal: goal.trim(),
        goalType: type,
        timeframe,
        weeklyHours: Number(hours) || 10,
        workspaceContext: context,
        instruction: "Return JSON plan: title, goal_analysis, topic_mastery_guides, weekly_roadmap, daily_execution_plan, remember_this_notes, common_mistakes_to_avoid, backup_plan_if_behind, priority_matrix, estimated_effort, risks_and_blockers, success_metrics, ai_reasoning, recommendations.",
      })

      setResponse(result.data.content)
      const completedPlan = parsePlan(result.data.content)
      if (!completedPlan) throw new Error("The AI returned an incomplete plan structure. Please try again.")

      setStage("Saving master plan to your workspace...")

      const [planSave, recommendationsSave, activitySave] = await Promise.all([
        supabase.from("planner_runs").insert({
          user_id: user.id,
          title: completedPlan.title,
          goal: goal.trim(),
          goal_type: type,
          plan: completedPlan,
        }),
        supabase.from("ai_recommendations").insert(
          completedPlan.recommendations.map((content) => ({
            user_id: user.id,
            content,
            source: "Master Mentor Orchestrator",
          }))
        ),
        supabase.from("activity_events").insert({
          user_id: user.id,
          event_type: "orchestrated_plan_generated",
          description: `Generated mentor plan: ${completedPlan.title}`,
        }),
      ])

      if (planSave.error) throw new Error(planSave.error.message)
      if (recommendationsSave.error) throw new Error(recommendationsSave.error.message)
      if (activitySave.error) throw new Error(activitySave.error.message)

      await Promise.all([
        plannerHistoryService.record(user.id, {
          planner_run_id: null,
          interaction_type: "request",
          summary: `Planning request: ${goal.trim()}`,
          content: { goal: goal.trim(), goalType: type, timeframe, weeklyHours: Number(hours) || 10 },
          meaningful: true,
        }),
        plannerHistoryService.record(user.id, {
          planner_run_id: null,
          interaction_type: "plan_summary",
          summary: completedPlan.ai_reasoning.rationale,
          content: { title: completedPlan.title, recommendations: completedPlan.recommendations },
          meaningful: true,
        }),
        preferenceLearningService.deriveFromTasks(user.id),
      ])

      setStage(`Mentor Plan ready (${result.source === "cache" ? "cached" : "generated"})`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.")
      setStage("Planning paused")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-7 pb-8">
      {/* Header Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-card p-6 shadow-2xl shadow-primary/5 sm:p-9">
        <div className="absolute -right-20 -top-24 size-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <Badge className="mb-4 bg-primary/15 text-primary">
              <BrainCircuit className="mr-1 size-3" />
              AI Academic & Technical Mentor
            </Badge>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
              Master how to learn, <span className="text-primary">not just what to study.</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Pattern recognition, practice progression, active recall, and realistic fallback strategies tailored to your exact goal and exams.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {modules.map(({ name, icon: Icon }) => (
              <div key={name} className="rounded-xl border border-border/70 bg-background/40 p-3 text-center">
                <Icon className="mx-auto size-4 text-primary" />
                <p className="mt-1 text-xs font-medium">{name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Input Section */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardContent className="p-5 sm:p-7">
            <div className="mb-6 flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Target className="size-4" />
              </span>
              <div>
                <h2 className="font-semibold">What subject, exam, or skill do you want to master?</h2>
                <p className="text-sm text-muted-foreground">
                  State your topic, target exam, timeline, or current confusion points.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                {goalTypes.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setType(item)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition ${
                      type === item
                        ? "border-primary/50 bg-primary/15 text-primary"
                        : "border-border bg-muted/30 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <textarea
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                placeholder="Example: How should I prepare DSA for my exams in 4 weeks? Focus on key patterns and exam question strategy."
                className="min-h-36 w-full resize-y rounded-2xl border border-border bg-background/50 p-4 text-sm leading-6 outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-medium">
                  Timeframe
                  <input
                    value={timeframe}
                    onChange={(event) => setTimeframe(event.target.value)}
                    className="h-11 w-full rounded-xl border bg-background/50 px-3 font-normal outline-none focus:border-primary/60"
                    placeholder="e.g. 4 weeks"
                  />
                </label>
                <label className="space-y-2 text-sm font-medium">
                  Hours available each week
                  <input
                    value={hours}
                    onChange={(event) => setHours(event.target.value)}
                    type="number"
                    min="1"
                    max="80"
                    className="h-11 w-full rounded-xl border bg-background/50 px-3 font-normal outline-none focus:border-primary/60"
                  />
                </label>
              </div>

              {error && (
                <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">
                  {error}
                </p>
              )}

              <Button size="lg" onClick={() => void generatePlan()} disabled={loading} className="w-full sm:w-auto">
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Orchestrating...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    Build Mentor Preparation Plan
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar Status & Starters */}
        <aside className="space-y-4">
          <Card>
            <CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-[.18em] text-muted-foreground">Mentorship status</p>
              <div className="mt-4 flex items-center gap-3">
                <span
                  className={`flex size-9 items-center justify-center rounded-full ${
                    loading ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <Gauge className="size-4" />}
                </span>
                <p className="text-sm font-medium" aria-live="polite">
                  {stage}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <p className="mb-3 text-sm font-medium">Starter Questions</p>
              {starterGoals.map((item) => (
                <button
                  key={item}
                  onClick={() => setGoal(item)}
                  className="mb-2 w-full rounded-xl border border-border/70 bg-background/30 p-3 text-left text-sm text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                >
                  {item}
                </button>
              ))}
            </CardContent>
          </Card>
        </aside>
      </div>

      {/* Results Dashboard */}
      {(loading || response) && (
        <section className="rounded-3xl border border-border bg-card/90 p-5 sm:p-7">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.18em] text-primary">
                Mentor Master Execution System
              </p>
              <h2 className="mt-1 text-xl font-semibold">{plan?.title ?? "Building your mentorship system"}</h2>
            </div>
            {loading && <Badge className="animate-pulse bg-primary/15 text-primary">Building plan live</Badge>}
          </div>

          {plan ? <PlanDashboard plan={plan} userId={user?.id} /> : <StreamingState response={response} stage={stage} />}
        </section>
      )}
    </div>
  )
}

function StreamingState({ response, stage }: { response: string; stage: string }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
        <BrainCircuit className="size-5 text-primary" />
        <p className="mt-3 font-medium">{stage}</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          The AI mentor is organizing pattern recognition guides, active recall checks, and realistic workload limits.
        </p>
        <div className="mt-5 space-y-2">
          {modules.map(({ name }) => (
            <div key={name} className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="size-2 animate-pulse rounded-full bg-primary" />
              {name} context connected
            </div>
          ))}
        </div>
      </div>
      <pre
        aria-live="polite"
        className="max-h-80 overflow-auto whitespace-pre-wrap rounded-2xl border border-border bg-background/60 p-4 text-xs leading-6 text-muted-foreground"
      >
        {response || "Waiting for mentor stream..."}
      </pre>
    </div>
  )
}

function PlanDashboard({ plan, userId }: { plan: OrchestratedPlan; userId?: string }) {
  const [activeTab, setActiveTab] = useState<"strategy" | "patterns" | "daily" | "recall" | "roadmap">("strategy")
  const [converting, setConverting] = useState(false)
  const [conversionSuccess, setConversionSuccess] = useState<string | null>(null)

  async function convertPlanToTasks() {
    if (!supabase || !userId) return
    setConverting(true)
    setConversionSuccess(null)

    try {
      const now = new Date()
      const newTasks: any[] = []

      plan.daily_execution_plan.forEach((dayItem, dayIdx) => {
        const dueDate = new Date(now)
        dueDate.setDate(dueDate.getDate() + dayIdx)
        dueDate.setHours(18, 0, 0, 0)

        dayItem.tasks.forEach((task) => {
          let priority: Priority = "Medium"
          if (task.type === "Test" || task.type === "Practice") priority = "High"
          else if (task.type === "Revise") priority = "Medium"
          else priority = "Low"

          newTasks.push({
            user_id: userId,
            title: `[${dayItem.day} - ${task.type}] ${task.action}`,
            due_at: dueDate.toISOString(),
            priority,
            estimated_hours: (task.estimated_minutes || 45) / 60,
            status: "todo",
          })
        })
      })

      if (newTasks.length > 0) {
        const { error } = await supabase.from("student_tasks").insert(newTasks)
        if (error) throw error

        await supabase.from("activity_events").insert({
          user_id: userId,
          event_type: "planner_tasks_converted",
          description: `Converted ${newTasks.length} daily plan items into StudentOS tasks`,
        })

        setConversionSuccess(`Successfully added ${newTasks.length} tasks to your StudentOS Tasks execution list!`)
      }
    } catch (err: any) {
      console.error("Task conversion failed:", err.message)
    } finally {
      setConverting(false)
    }
  }

  return (
    <div className="space-y-7">
      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={activeTab === "strategy" ? "default" : "secondary"}
            size="sm"
            onClick={() => setActiveTab("strategy")}
          >
            <Target className="mr-1.5 size-4" />
            Mentor Strategy
          </Button>

          {plan.topic_mastery_guides && plan.topic_mastery_guides.length > 0 && (
            <Button
              variant={activeTab === "patterns" ? "default" : "secondary"}
              size="sm"
              onClick={() => setActiveTab("patterns")}
            >
              <BrainCircuit className="mr-1.5 size-4" />
              Pattern Mastery Guides ({plan.topic_mastery_guides.length})
            </Button>
          )}

          <Button
            variant={activeTab === "daily" ? "default" : "secondary"}
            size="sm"
            onClick={() => setActiveTab("daily")}
          >
            <Clock3 className="mr-1.5 size-4" />
            Daily Execution
          </Button>

          <Button
            variant={activeTab === "recall" ? "default" : "secondary"}
            size="sm"
            onClick={() => setActiveTab("recall")}
          >
            <Zap className="mr-1.5 size-4" />
            Active Recall & Notes
          </Button>

          <Button
            variant={activeTab === "roadmap" ? "default" : "secondary"}
            size="sm"
            onClick={() => setActiveTab("roadmap")}
          >
            <CalendarDays className="mr-1.5 size-4" />
            Roadmap & Backup Plan
          </Button>
        </div>

        {/* 1-Click Convert to Tasks Action Button */}
        <Button
          onClick={() => void convertPlanToTasks()}
          disabled={converting}
          variant="secondary"
          size="sm"
          className="border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
        >
          {converting ? (
            <Loader2 className="mr-1.5 size-4 animate-spin" />
          ) : (
            <ListCheck className="mr-1.5 size-4" />
          )}
          Convert Plan to StudentOS Tasks
        </Button>
      </div>

      {conversionSuccess && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-200">
          <Check className="size-4 shrink-0 text-emerald-400" />
          {conversionSuccess}
        </div>
      )}

      {/* TAB 1: STRATEGY */}
      {activeTab === "strategy" && (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">Goal Analysis & Mode</p>
                  <Badge className="bg-primary/20 text-primary">{plan.goal_analysis.preparation_mode}</Badge>
                </div>

                <h3 className="mt-3 text-lg font-semibold">{plan.goal_analysis.objective}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{plan.goal_analysis.scope}</p>

                {/* Priority Yield Strategy Breakdown */}
                <div className="mt-5 space-y-3 rounded-2xl border border-border bg-background/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Yield Priority Strategy
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex gap-2">
                      <PriorityBadge value="High" />
                      <p className="text-muted-foreground">{plan.goal_analysis.yield_strategy.high_priority_focus}</p>
                    </div>
                    <div className="flex gap-2">
                      <PriorityBadge value="Medium" />
                      <p className="text-muted-foreground">{plan.goal_analysis.yield_strategy.medium_priority_focus}</p>
                    </div>
                    <div className="flex gap-2">
                      <PriorityBadge value="Low" />
                      <p className="text-muted-foreground">{plan.goal_analysis.yield_strategy.low_priority_optional}</p>
                    </div>
                  </div>
                </div>

                {/* Time Compressed Fallback */}
                {plan.goal_analysis.time_compressed_fallback && (
                  <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
                    <p className="flex items-center gap-2 font-semibold text-amber-300">
                      <AlertTriangle className="size-4" />
                      Time-Compressed Fallback Strategy
                    </p>
                    <p className="mt-1 text-xs leading-5 text-amber-200/90 sm:text-sm">
                      {plan.goal_analysis.time_compressed_fallback}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Capacity & Hours</p>
                <p className="mt-3 text-3xl font-semibold">{plan.estimated_effort.total_hours}h total</p>
                <p className="text-sm text-muted-foreground">{plan.estimated_effort.weekly_hours}h allocated each week</p>

                <div className="mt-5 space-y-3">
                  {plan.estimated_effort.allocation.map((item) => (
                    <div key={item.module} className="rounded-xl border border-border p-3 text-sm">
                      <div className="flex justify-between font-medium">
                        <span>{item.module}</span>
                        <span className="text-primary">{item.hours}h</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{item.rationale}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Module Coordination & Priority Matrix */}
          <div className="grid gap-6 xl:grid-cols-2">
            <DashboardSection title="Priority matrix" icon={<Target />}>
              {plan.priority_matrix.map((item) => (
                <div key={item.item} className="rounded-xl border border-border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{item.item}</p>
                    <PriorityBadge value={item.impact} />
                    <Badge className="bg-muted text-muted-foreground">{item.quadrant}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{item.next_action}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Urgency: {item.urgency}</p>
                </div>
              ))}
            </DashboardSection>

            <DashboardSection title="AI Mentor Reasoning" icon={<Lightbulb />}>
              <p className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm leading-6">
                {plan.ai_reasoning.rationale}
              </p>
              <div className="mt-3">
                <p className="text-sm font-medium">Tradeoffs considered</p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {plan.ai_reasoning.tradeoffs.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            </DashboardSection>
          </div>
        </div>
      )}

      {/* TAB 2: PATTERN & TOPIC MASTERY GUIDES */}
      {activeTab === "patterns" && plan.topic_mastery_guides && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Pattern & Concept Mastery Guides</h3>
              <p className="text-sm text-muted-foreground">
                Intuitive explanations, recognition signals, beginner pitfalls, and move-on benchmarks.
              </p>
            </div>
          </div>

          <div className="grid gap-6">
            {plan.topic_mastery_guides.map((guide, idx) => (
              <Card key={`${guide.topic}-${idx}`} className="overflow-hidden border-primary/20">
                <CardContent className="p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-primary/15 text-primary">{guide.category}</Badge>
                        <PriorityBadge value={guide.priority} />
                      </div>
                      <h4 className="mt-2 text-xl font-bold text-foreground">{guide.topic}</h4>
                    </div>
                  </div>

                  {/* What is it & Why it works */}
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-border bg-muted/20 p-4">
                      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                        <BookOpen className="size-3.5" />
                        What is it?
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{guide.what_is_it}</p>
                    </div>

                    <div className="rounded-2xl border border-border bg-muted/20 p-4">
                      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                        <BrainCircuit className="size-3.5" />
                        Why does it work?
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{guide.why_it_works}</p>
                    </div>
                  </div>

                  {/* How to Recognize Signals */}
                  <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                      <HelpCircle className="size-3.5" />
                      How do I recognize it in a problem statement?
                    </p>
                    <p className="mt-2 text-sm leading-6 text-foreground/90">{guide.how_to_recognize}</p>
                  </div>

                  {/* Key Rules & Common Traps */}
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {guide.remember_this && guide.remember_this.length > 0 && (
                      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                          <Zap className="size-3.5" />
                          Key Rules & Mental Models
                        </p>
                        <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                          {guide.remember_this.map((note, nIdx) => (
                            <li key={nIdx} className="flex gap-2">
                              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                              {note}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {guide.common_traps && guide.common_traps.length > 0 && (
                      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4">
                        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-rose-400">
                          <ShieldAlert className="size-3.5" />
                          Common Beginner Traps
                        </p>
                        <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                          {guide.common_traps.map((trap, tIdx) => (
                            <li key={tIdx} className="flex gap-2">
                              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose-400" />
                              {trap}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Practice Progression & Move-On Checklist */}
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {guide.practice_progression && guide.practice_progression.length > 0 && (
                      <div className="rounded-2xl border border-border bg-background/50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Practice Progression
                        </p>
                        <div className="mt-2 space-y-2">
                          {guide.practice_progression.map((prog, pIdx) => (
                            <div key={pIdx} className="flex items-start gap-2 text-sm">
                              <Badge className="shrink-0 border-border bg-muted/30 text-muted-foreground text-xs font-normal">
                                {prog.level}
                              </Badge>
                              <p className="text-muted-foreground">{prog.goal}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {guide.move_on_checklist && guide.move_on_checklist.length > 0 && (
                      <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
                        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                          <CheckCircle2 className="size-3.5" />
                          Move On When... (Mastery Checklist)
                        </p>
                        <ul className="mt-2 space-y-1.5 text-sm text-foreground/90">
                          {guide.move_on_checklist.map((chk, cIdx) => (
                            <li key={cIdx} className="flex gap-2">
                              <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                              {chk}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: DAILY EXECUTION PLAN */}
      {activeTab === "daily" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">Daily Mentor Execution Plan</h3>
              <p className="text-sm text-muted-foreground">
                Actionable daily schedule categorized into Teach, Practice, Recall, Revise, and Test steps.
              </p>
            </div>
            <Button
              onClick={() => void convertPlanToTasks()}
              disabled={converting}
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {converting ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <ListCheck className="mr-1.5 size-4" />}
              Sync to StudentOS Tasks
            </Button>
          </div>

          <div className="grid gap-5">
            {plan.daily_execution_plan.map((dayItem) => (
              <Card key={dayItem.day} className="border-border">
                <CardContent className="p-5">
                  <div className="flex justify-between gap-3 border-b border-border/60 pb-3">
                    <div>
                      <p className="font-semibold text-foreground">{dayItem.day}</p>
                      <p className="mt-0.5 text-sm text-primary">{dayItem.focus}</p>
                    </div>
                    <Badge className="h-6 border-border bg-muted/30 text-muted-foreground font-normal">
                      {dayItem.estimated_hours}h estimated
                    </Badge>
                  </div>

                  <div className="mt-4 space-y-3">
                    {dayItem.tasks.map((task, tIdx) => (
                      <div
                        key={tIdx}
                        className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-background/60 p-3 text-sm"
                      >
                        <div className="flex gap-3 min-w-0 flex-1">
                          <TaskTypeBadge type={task.type} />
                          <div>
                            <p className="font-medium text-foreground">{task.action}</p>
                            {task.move_on_trigger && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                <span className="font-medium text-primary">Move on trigger:</span> {task.move_on_trigger}
                              </p>
                            )}
                          </div>
                        </div>

                        <span className="text-xs font-medium text-muted-foreground">{task.estimated_minutes} min</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: ACTIVE RECALL & NOTES */}
      {activeTab === "recall" && (
        <div className="space-y-6">
          {plan.remember_this_notes && plan.remember_this_notes.length > 0 && (
            <DashboardSection title="High-Yield Flashcard Notes & Active Recall" icon={<Zap />}>
              <div className="grid gap-4 md:grid-cols-2">
                {plan.remember_this_notes.map((note, nIdx) => (
                  <div key={nIdx} className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
                    <Badge className="bg-emerald-500/20 text-emerald-300">{note.topic}</Badge>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Key Takeaway</p>
                      <p className="mt-1 text-sm font-medium leading-6 text-foreground">{note.key_takeaway}</p>
                    </div>

                    <div className="rounded-xl border border-emerald-500/30 bg-background/80 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Active Recall Prompt</p>
                      <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{note.active_recall_prompt}</p>
                    </div>
                  </div>
                ))}
              </div>
            </DashboardSection>
          )}

          {plan.common_mistakes_to_avoid && plan.common_mistakes_to_avoid.length > 0 && (
            <DashboardSection title="Common Mistakes to Avoid" icon={<ShieldAlert />}>
              <div className="grid gap-3 sm:grid-cols-2">
                {plan.common_mistakes_to_avoid.map((mistake, mIdx) => (
                  <div key={mIdx} className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-sm flex gap-2">
                    <AlertTriangle className="size-4 shrink-0 text-amber-400 mt-0.5" />
                    <p className="text-muted-foreground">{mistake}</p>
                  </div>
                ))}
              </div>
            </DashboardSection>
          )}
        </div>
      )}

      {/* TAB 5: ROADMAP & BACKUP PLAN */}
      {activeTab === "roadmap" && (
        <div className="space-y-6">
          <DashboardSection title="Weekly Roadmap & Deliverables" icon={<CalendarDays />}>
            {plan.weekly_roadmap.map((week) => (
              <div key={week.week} className="rounded-2xl border border-border bg-muted/15 p-4 space-y-3">
                <div className="flex justify-between gap-3">
                  <p className="font-medium text-foreground">{week.week}</p>
                  <span className="text-sm font-medium text-primary">{week.estimated_hours}h</span>
                </div>
                <p className="text-sm text-muted-foreground">{week.outcome}</p>
                <ul className="space-y-1.5 text-sm">
                  {week.deliverables.map((item) => (
                    <li key={item} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                      {item}
                    </li>
                  ))}
                </ul>

                {week.move_on_checklist && week.move_on_checklist.length > 0 && (
                  <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs">
                    <p className="font-semibold text-primary">Week Checkpoint:</p>
                    <ul className="mt-1 space-y-1 text-muted-foreground">
                      {week.move_on_checklist.map((chk, cIdx) => (
                        <li key={cIdx}>• {chk}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </DashboardSection>

          {plan.backup_plan_if_behind && (
            <Card className="border-rose-500/20 bg-rose-500/5">
              <CardContent className="p-5 space-y-3">
                <p className="flex items-center gap-2 font-semibold text-rose-300">
                  <ShieldAlert className="size-4" />
                  Backup Compression Plan (If You Fall Behind)
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Trigger:</span> {plan.backup_plan_if_behind.trigger_condition}
                </p>

                <div className="space-y-2 text-sm">
                  {plan.backup_plan_if_behind.actionable_compression_steps.map((step, sIdx) => (
                    <div key={sIdx} className="flex items-start gap-2 text-muted-foreground">
                      <ChevronRight className="size-4 shrink-0 text-rose-400 mt-0.5" />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

function DashboardSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="mb-4 flex items-center gap-2 font-semibold text-foreground [&>svg]:size-4 [&>svg]:text-primary">
          {icon}
          {title}
        </h3>
        <div className="grid gap-3">{children}</div>
      </CardContent>
    </Card>
  )
}

function PriorityBadge({ value }: { value: Priority }) {
  return (
    <Badge
      className={
        value === "High"
          ? "border-rose-400/30 bg-rose-400/15 text-rose-200"
          : value === "Medium"
          ? "border-amber-400/30 bg-amber-400/15 text-amber-200"
          : "bg-muted text-muted-foreground"
      }
    >
      {value}
    </Badge>
  )
}

function TaskTypeBadge({ type }: { type: DailyTaskItem["type"] }) {
  let color = "bg-primary/15 text-primary border-primary/30"
  if (type === "Teach/Learn") color = "bg-sky-400/15 text-sky-200 border-sky-400/30"
  else if (type === "Practice") color = "bg-indigo-400/15 text-indigo-200 border-indigo-400/30"
  else if (type === "Recall") color = "bg-emerald-400/15 text-emerald-200 border-emerald-400/30"
  else if (type === "Revise") color = "bg-amber-400/15 text-amber-200 border-amber-400/30"
  else if (type === "Test") color = "bg-rose-400/15 text-rose-200 border-rose-400/30"

  return (
    <Badge className={`shrink-0 border font-medium ${color}`}>
      {type}
    </Badge>
  )
}
