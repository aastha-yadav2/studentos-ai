import { supabase } from "@/lib/supabase"
import type { AdaptiveRecommendation, HabitInsight } from "./types"

const db = () => { if (!supabase) throw new Error("Supabase is not configured."); return supabase }
const value = (insights: HabitInsight[], key: string) => insights.find((item) => item.insight_key === key)?.insight_value as Record<string, unknown> | undefined

export const adaptivePlanner = {
  async active(userId: string) { const { data, error } = await db().from("adaptive_recommendations").select("*").eq("user_id", userId).eq("status", "active").order("created_at", { ascending: false }).limit(6); if (error) throw error; return (data ?? []) as AdaptiveRecommendation[] },
  async contextForPlan(userId: string) { const [habits, tasks] = await Promise.all([db().from("habit_insights").select("*").eq("user_id", userId), db().from("student_tasks").select("title,status,priority,estimated_hours,due_at,completed_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(100)]); if (habits.error) throw habits.error; if (tasks.error) throw tasks.error; const taskList = tasks.data ?? []; const completed = taskList.filter((item) => item.status === "completed").length; const skipped = taskList.filter((item) => item.status !== "completed" && item.due_at && new Date(item.due_at) < new Date()).length; return { habits: habits.data ?? [], completionRate: Math.round(100 * completed / Math.max(1, taskList.length)), skippedTasks: skipped, completedTasks: completed, planningGuidance: "Use these observed patterns to schedule fewer, better-timed tasks. Explain every adjustment and do not repeat failed timing or workload patterns." } },
  async generate(userId: string, habits: HabitInsight[]) {
    const [tasks, goals] = await Promise.all([db().from("student_tasks").select("id,title,priority,due_at,status,estimated_hours").eq("user_id", userId).neq("status", "completed").order("due_at").limit(20), db().from("goals").select("id,title,progress,target_date,status").eq("user_id", userId).eq("status", "active").order("target_date").limit(12)])
    if (tasks.error) throw tasks.error; if (goals.error) throw goals.error
    const duration = value(habits, "preferred_task_duration_hours")?.average; const weekday = value(habits, "productive_weekday")?.weekday
    const next = (tasks.data ?? [])[0]; const overdue = (tasks.data ?? []).filter((task) => task.due_at && new Date(task.due_at) < new Date()); const items: Omit<AdaptiveRecommendation, "id" | "created_at">[] = []
    if (next) items.push({ recommendation_type: "next_task", title: `Next: ${next.title}`, rationale: `This is your nearest open ${next.priority.toLowerCase()} priority task${next.due_at ? " with an upcoming deadline" : ""}.`, payload: { taskId: next.id }, status: "active" })
    if (duration) items.push({ recommendation_type: "workload", title: `Plan study blocks around ${duration}h`, rationale: `Your completed-task history shows this as your typical sustainable task duration.`, payload: { preferredHours: duration }, status: "active" })
    if (weekday !== undefined && weekday !== null) items.push({ recommendation_type: "schedule", title: "Reserve your strongest weekday for deep work", rationale: "You have completed more recorded tasks on this weekday than on other days.", payload: { weekday }, status: "active" })
    if (overdue.length) items.push({ recommendation_type: "goal", title: `Rescope ${overdue.length} overdue task${overdue.length === 1 ? "" : "s"}`, rationale: "These tasks are past their scheduled deadline; carrying them unchanged repeats an unsuccessful schedule.", payload: { taskIds: overdue.map((task) => task.id) }, status: "active" })
    if (!items.length) return []
    const { data, error } = await db().from("adaptive_recommendations").insert(items.map((item) => ({ user_id: userId, ...item }))).select("*"); if (error) throw error; return (data ?? []) as AdaptiveRecommendation[]
  },
}
