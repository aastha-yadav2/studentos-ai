import { supabase } from "@/lib/supabase"
import type { LearnedPreference } from "./types"

function client() { if (!supabase) throw new Error("Supabase is not configured."); return supabase }
export const preferenceLearningService = {
  async list(userId: string) { const { data, error } = await client().from("learned_preferences").select("*").eq("user_id", userId).order("updated_at", { ascending: false }); if (error) throw error; return (data ?? []) as LearnedPreference[] },
  async learn(userId: string, key: string, value: unknown, confidence: number, source: string) { const { error } = await client().from("learned_preferences").upsert({ user_id: userId, preference_key: key, preference_value: value, confidence, source, updated_at: new Date().toISOString() }, { onConflict: "user_id,preference_key" }); if (error) throw error },
  async deriveFromTasks(userId: string) { const { data, error } = await client().from("student_tasks").select("estimated_hours,status").eq("user_id", userId).eq("status", "completed").not("estimated_hours", "is", null).limit(100); if (error) throw error; const values = (data ?? []).map((task) => Number(task.estimated_hours)).filter(Number.isFinite); if (!values.length) return; const average = Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10; await this.learn(userId, "preferred_task_duration_hours", { average }, Math.min(.9, .45 + values.length / 100), "completed_tasks") },
}
