import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/auth/auth-provider"
import { supabase, supabaseConfigError } from "@/lib/supabase"

export type TaskPriority = "High" | "Medium" | "Low"
export type TaskStatus = "todo" | "in_progress" | "completed"
export type ManagedTask = { id: string; title: string; due_at: string | null; priority: TaskPriority; estimated_hours: number | null; status: TaskStatus; completed_at: string | null; created_at: string }
export type TaskInput = { title: string; dueAt: string; priority: TaskPriority; estimatedHours: string; status: TaskStatus }

export function useTasks() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<ManagedTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!supabase || !user) { setLoading(false); if (!supabase) setError(supabaseConfigError); return }
    setLoading(true)
    const { data, error: loadError } = await supabase.from("student_tasks").select("id,title,due_at,priority,estimated_hours,status,completed_at,created_at").eq("user_id", user.id).order("status").order("due_at", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false })
    if (loadError) setError(loadError.message); else { setTasks((data ?? []) as ManagedTask[]); setError(null) }
    setLoading(false)
  }, [user])

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh() }, 0)
    return () => window.clearTimeout(timer)
  }, [refresh])

  useEffect(() => {
    const client = supabase
    if (!client || !user) return
    const channel = client.channel(`tasks-${user.id}`).on("postgres_changes", { event: "*", schema: "public", table: "student_tasks", filter: `user_id=eq.${user.id}` }, refresh).subscribe()
    return () => { void client.removeChannel(channel) }
  }, [refresh, user])

  async function create(input: TaskInput) {
    if (!supabase || !user) return setError(supabaseConfigError ?? "Your session is unavailable.")
    const { error: saveError } = await supabase.from("student_tasks").insert({ user_id: user.id, title: input.title.trim(), due_at: input.dueAt ? new Date(input.dueAt).toISOString() : null, priority: input.priority, estimated_hours: input.estimatedHours ? Number(input.estimatedHours) : null, status: input.status, completed_at: input.status === "completed" ? new Date().toISOString() : null })
    if (saveError) setError(saveError.message); else await refresh()
  }

  async function update(id: string, input: TaskInput) {
    if (!supabase || !user) return setError(supabaseConfigError ?? "Your session is unavailable.")
    const { error: saveError } = await supabase.from("student_tasks").update({ title: input.title.trim(), due_at: input.dueAt ? new Date(input.dueAt).toISOString() : null, priority: input.priority, estimated_hours: input.estimatedHours ? Number(input.estimatedHours) : null, status: input.status, completed_at: input.status === "completed" ? new Date().toISOString() : null }).eq("id", id).eq("user_id", user.id)
    if (saveError) setError(saveError.message); else await refresh()
  }

  async function toggleComplete(task: ManagedTask) {
    if (!supabase || !user) return setError(supabaseConfigError ?? "Your session is unavailable.")
    const completed = task.status !== "completed"
    const { error: saveError } = await supabase.from("student_tasks").update({ status: completed ? "completed" : "todo", completed_at: completed ? new Date().toISOString() : null }).eq("id", task.id).eq("user_id", user.id)
    if (saveError) setError(saveError.message); else await refresh()
  }

  async function remove(id: string) {
    if (!supabase || !user) return setError(supabaseConfigError ?? "Your session is unavailable.")
    const { error: deleteError } = await supabase.from("student_tasks").delete().eq("id", id).eq("user_id", user.id)
    if (deleteError) setError(deleteError.message); else await refresh()
  }

  return { tasks, loading, error, clearError: () => setError(null), create, update, toggleComplete, remove, refresh }
}
