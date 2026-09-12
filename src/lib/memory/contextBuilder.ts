import { supabase } from "@/lib/supabase"
import { memoryService } from "./memoryService"
import { plannerHistoryService } from "./plannerHistoryService"
import { preferenceLearningService } from "./preferenceLearningService"
import { profileService } from "./profileService"
import type { AIContext } from "./types"

export async function buildAIContext(userId: string): Promise<AIContext> {
  if (!supabase) throw new Error("Supabase is not configured.")
  const db = supabase
  const fallback = <T,>(promise: PromiseLike<T>, value: T) => Promise.resolve(promise).catch(() => value)

  const [profile, activeGoals, plannerHistory, recentInteractions, learnedPreferences, memoryEntries, completedTasks] = await Promise.all([
    fallback(profileService.get(userId), null),
    fallback(
      db.from("goals").select("title,category,target_date,progress,status").eq("user_id", userId).in("status", ["active", "paused"]).order("updated_at", { ascending: false }).limit(6).then(({ data }) => data ?? []),
      []
    ),
    fallback(
      plannerHistoryService.list(userId, 3).then((list) => list.map(({ plan: _, ...rest }) => rest as any)),
      []
    ),
    fallback(
      plannerHistoryService.interactions(userId, 4).then((list) => list.map(({ content: _, ...rest }) => rest as any)),
      []
    ),
    fallback(preferenceLearningService.list(userId), []),
    fallback(memoryService.list(userId, { limit: 6 }), []),
    fallback(
      db.from("student_tasks").select("estimated_hours").eq("user_id", userId).eq("status", "completed").not("estimated_hours", "is", null).limit(20).then(({ data }) => data ?? []),
      []
    ),
  ])

  const durations = completedTasks.map((task) => Number(task.estimated_hours)).filter(Number.isFinite)
  const taskPatterns = {
    completedTaskCount: completedTasks.length,
    averageEstimatedHours: durations.length ? Math.round((durations.reduce((sum, value) => sum + value, 0) / durations.length) * 10) / 10 : null,
  }

  return { profile, activeGoals, plannerHistory, recentInteractions, learnedPreferences, memoryEntries, taskPatterns }
}

export async function buildCompactPlannerContext(userId: string) {
  if (!supabase) return {}
  const db = supabase
  const fallback = <T,>(promise: PromiseLike<T>, value: T) => Promise.resolve(promise).catch(() => value)

  const [profile, goals, subjects, tasks, memory] = await Promise.all([
    fallback(db.from("student_profiles").select("semester,skills,career_goals,learning_goals").eq("user_id", userId).maybeSingle().then(({ data }) => data), null),
    fallback(db.from("goals").select("title,category,target_date").eq("user_id", userId).eq("status", "active").limit(5).then(({ data }) => data ?? []), []),
    fallback(db.from("subjects").select("name,exam_date,confidence").eq("user_id", userId).order("exam_date").limit(5).then(({ data }) => data ?? []), []),
    fallback(db.from("student_tasks").select("title,due_at,priority").eq("user_id", userId).neq("status", "completed").order("due_at").limit(5).then(({ data }) => data ?? []), []),
    fallback(memoryService.list(userId, { limit: 4 }), []),
  ])

  return {
    student_profile: profile
      ? {
          semester: profile.semester,
          skills: Array.isArray(profile.skills) ? profile.skills.slice(0, 8) : [],
          career_goals: Array.isArray(profile.career_goals) ? profile.career_goals.slice(0, 4) : [],
        }
      : null,
    active_goals: goals.map((g) => ({ title: g.title, category: g.category })),
    subjects: subjects.map((s) => ({ name: s.name, exam_date: s.exam_date, confidence: `${s.confidence}/5` })),
    open_tasks: tasks.map((t) => ({ title: t.title, priority: t.priority })),
    recent_memories: memory.map((m) => String(m.summary || m.content || "").slice(0, 100)),
  }
}
