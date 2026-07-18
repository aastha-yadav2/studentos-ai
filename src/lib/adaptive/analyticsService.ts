import { supabase } from "@/lib/supabase"
import type { MonthlyReport, MonthlyReportData } from "./types"

const db = () => { if (!supabase) throw new Error("Supabase is not configured."); return supabase }
const day = (value: Date) => value.toISOString().slice(0, 10)
const weekDay = new Intl.DateTimeFormat(undefined, { weekday: "long" })

export const analyticsService = {
  async latestReport(userId: string) { const { data, error } = await db().from("monthly_performance_reports").select("*").eq("user_id", userId).order("period_start", { ascending: false }).limit(1).maybeSingle(); if (error) throw error; return data as MonthlyReport | null },
  async generateMonthlyReport(userId: string) {
    const end = new Date(); end.setHours(23, 59, 59, 999); const start = new Date(end); start.setDate(1); start.setHours(0, 0, 0, 0)
    const { data: tasks, error } = await db().from("student_tasks").select("id,title,status,estimated_hours,created_at,completed_at,due_at").eq("user_id", userId).gte("created_at", start.toISOString()).lte("created_at", end.toISOString())
    if (error) throw error
    const completed = (tasks ?? []).filter((task) => task.status === "completed")
    const perDay = new Map<string, { completed: number; total: number; hours: number }>()
    for (const task of tasks ?? []) { const key = day(new Date(task.completed_at ?? task.due_at ?? task.created_at)); const entry = perDay.get(key) ?? { completed: 0, total: 0, hours: 0 }; entry.total++; if (task.status === "completed") { entry.completed++; entry.hours += Number(task.estimated_hours ?? 0) }; perDay.set(key, entry) }
    const dailyProductivity = [...perDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, score: Math.round(100 * value.completed / Math.max(1, value.total)) }))
    const weekdayScores = new Map<string, number[]>(); dailyProductivity.forEach((item) => { const name = weekDay.format(new Date(`${item.date}T12:00:00`)); weekdayScores.set(name, [...(weekdayScores.get(name) ?? []), item.score]) })
    const ranked = [...weekdayScores.entries()].map(([name, scores]) => ({ name, score: scores.reduce((a, b) => a + b, 0) / scores.length })).sort((a, b) => b.score - a.score)
    const { data: goals, error: goalError } = await db().from("goals").select("title,progress,status,updated_at,category").eq("user_id", userId)
    if (goalError) throw goalError
    const completedGoals = (goals ?? []).filter((goal) => goal.status === "completed").length
    const totalHours = completed.reduce((sum, task) => sum + Number(task.estimated_hours ?? 0), 0)
    const skills = new Map<string, number>(); (goals ?? []).forEach((goal) => skills.set(goal.category, Math.max(skills.get(goal.category) ?? 0, Number(goal.progress))))
    const completedDays = new Set(completed.map((task) => day(new Date(task.completed_at ?? task.created_at)))); let streak = 0; for (let cursor = new Date(end); completedDays.has(day(cursor)); cursor.setDate(cursor.getDate() - 1)) streak++
    const report: MonthlyReportData = { goalCompletionTrend: [completedGoals], studyTimeTrend: [Math.round(totalHours * 10) / 10], dailyProductivity, mostProductiveDays: ranked.slice(0, 2).map((item) => item.name), weakestDays: ranked.slice(-2).reverse().map((item) => item.name), achievements: completed.slice(0, 8).map((task) => ({ id: task.id, event_type: "achievement", title: task.title, description: "Task completed", occurred_at: task.completed_at ?? task.created_at })), skillGrowth: [...skills.entries()].map(([skill, progress]) => ({ skill, progress })), learningStreak: streak, careerProgress: Math.round((goals ?? []).filter((goal) => /career|internship|placement/i.test(goal.category)).reduce((sum, goal) => sum + Number(goal.progress), 0) / Math.max(1, (goals ?? []).filter((goal) => /career|internship|placement/i.test(goal.category)).length)) }
    const { data, error: saveError } = await db().from("monthly_performance_reports").upsert({ user_id: userId, period_start: day(start), period_end: day(end), report, generated_at: new Date().toISOString() }, { onConflict: "user_id,period_start" }).select("*").single()
    if (saveError) throw saveError
    await db().from("reflection_timeline_events").insert({ user_id: userId, event_type: "monthly_report", title: "Monthly performance report", description: `${completed.length} completed tasks and ${Math.round(totalHours * 10) / 10} recorded study hours.`, occurred_at: new Date().toISOString() })
    return data as MonthlyReport
  },
}
