import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/auth/auth-provider"
import { supabase } from "@/lib/supabase"
import type { WeeklyReflection } from "@/lib/adaptive/types"
import { useDemoMode } from "@/lib/demo/demoModeProvider"

export type Task = { id: string; title: string; due_at: string | null; priority: "High" | "Medium" | "Low"; estimated_hours: number | null; status: string }
export type Goal = { id: string; title: string; category: string; target_date: string | null; progress: number; status: string }
export type Deadline = { id: string; title: string; due_at: string; category: string }
export type PlannerRun = { id: string; title: string; goal_type: string; created_at: string }
export type Recommendation = { id: string; content: string; source: string; created_at: string }
export type Activity = { id: string; description: string; event_type: string; created_at: string }

export function useDashboardData() {
  const { user } = useAuth()
  const { enabled: demoEnabled, workspace } = useDemoMode()
  const [data, setData] = useState({ tasks: [] as Task[], goals: [] as Goal[], deadlines: [] as Deadline[], runs: [] as PlannerRun[], recommendations: [] as Recommendation[], activity: [] as Activity[], reflection: null as WeeklyReflection | null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => {
    if (demoEnabled) { setData({ tasks: workspace.tasks as unknown as Task[], goals: workspace.goals as unknown as Goal[], deadlines: workspace.deadlines as unknown as Deadline[], runs: [{ id: "demo-plan", title: "Internship sprint · week 4", goal_type: "Career", created_at: "2026-07-17T09:00:00.000Z" }], recommendations: workspace.recommendations as unknown as Recommendation[], activity: workspace.activity as unknown as Activity[], reflection: workspace.reflection as unknown as WeeklyReflection }); setLoading(false); return }
    if (!supabase || !user) { setLoading(false); return }
    setLoading(true)
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
    const [tasks, goals, deadlines, runs, recommendations, activity, reflection] = await Promise.all([
      supabase.from("student_tasks").select("id,title,due_at,priority,estimated_hours,status").eq("user_id", user.id).gte("due_at", today.toISOString()).lt("due_at", tomorrow.toISOString()).neq("status", "completed").order("priority").order("due_at"),
      supabase.from("goals").select("id,title,category,target_date,progress,status").eq("user_id", user.id).eq("status", "active").order("target_date").limit(4),
      supabase.from("deadlines").select("id,title,due_at,category").eq("user_id", user.id).gte("due_at", today.toISOString()).order("due_at").limit(5),
      supabase.from("planner_runs").select("id,title,goal_type,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(4),
      supabase.from("ai_recommendations").select("id,content,source,created_at").eq("user_id", user.id).eq("is_dismissed", false).order("created_at", { ascending: false }).limit(4),
      supabase.from("activity_events").select("id,description,event_type,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
      supabase.from("weekly_reflections").select("*").eq("user_id", user.id).order("period_start", { ascending: false }).limit(1).maybeSingle(),
    ])
    const failed = [tasks, goals, deadlines, runs, recommendations, activity, reflection].find((result) => result.error)?.error
    if (failed) setError(failed.message); else setData({ tasks: tasks.data ?? [], goals: goals.data ?? [], deadlines: deadlines.data ?? [], runs: runs.data ?? [], recommendations: recommendations.data ?? [], activity: activity.data ?? [], reflection: reflection.data as WeeklyReflection | null })
    setLoading(false)
  }, [demoEnabled, user, workspace])
  useEffect(() => {
    const timer = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(timer)
  }, [load])
  useEffect(() => {
    const client = supabase
    if (!client || !user || demoEnabled) return
    const channel = client.channel(`dashboard-${user.id}`).on("postgres_changes", { event: "*", schema: "public", table: "student_tasks", filter: `user_id=eq.${user.id}` }, load).on("postgres_changes", { event: "*", schema: "public", table: "goals", filter: `user_id=eq.${user.id}` }, load).on("postgres_changes", { event: "*", schema: "public", table: "deadlines", filter: `user_id=eq.${user.id}` }, load).on("postgres_changes", { event: "*", schema: "public", table: "planner_runs", filter: `user_id=eq.${user.id}` }, load).on("postgres_changes", { event: "*", schema: "public", table: "ai_recommendations", filter: `user_id=eq.${user.id}` }, load).on("postgres_changes", { event: "*", schema: "public", table: "activity_events", filter: `user_id=eq.${user.id}` }, load).subscribe()
    return () => { void client.removeChannel(channel) }
  }, [demoEnabled, load, user])
  return { ...data, loading, error, refresh: load }
}
