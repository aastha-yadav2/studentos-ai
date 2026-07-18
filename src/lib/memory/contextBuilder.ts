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
    fallback(db.from("goals").select("title,category,target_date,progress,status").eq("user_id", userId).in("status", ["active", "paused"]).order("updated_at", { ascending: false }).limit(12).then(({ data }) => data ?? []), []),
    fallback(plannerHistoryService.list(userId, 6), []),
    fallback(plannerHistoryService.interactions(userId, 8), []),
    fallback(preferenceLearningService.list(userId), []),
    fallback(memoryService.list(userId, { limit: 20 }), []),
    fallback(db.from("student_tasks").select("estimated_hours").eq("user_id", userId).eq("status", "completed").not("estimated_hours", "is", null).limit(100).then(({ data }) => data ?? []), []),
  ])
  const durations = completedTasks.map((task) => Number(task.estimated_hours)).filter(Number.isFinite)
  const taskPatterns = { completedTaskCount: completedTasks.length, averageEstimatedHours: durations.length ? Math.round((durations.reduce((sum, value) => sum + value, 0) / durations.length) * 10) / 10 : null }
  return { profile, activeGoals, plannerHistory, recentInteractions, learnedPreferences, memoryEntries, taskPatterns }
}
