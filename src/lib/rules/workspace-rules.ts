export type RuleRecommendation = { priority: "High" | "Medium" | "Low"; content: string }

/** Deterministic workspace advice: intentionally no network or model calls. */
export function goalRecommendations(goal: { title: string; progress: number; target_date?: string | null }, milestones: { title: string; is_completed: boolean; target_date?: string | null }[]): RuleRecommendation[] {
  const open = milestones.filter((item) => !item.is_completed)
  const overdue = open.filter((item) => item.target_date && new Date(item.target_date) < new Date()).length
  return [
    { priority: overdue ? "High" : "Medium", content: overdue ? `Reschedule ${overdue} overdue milestone${overdue === 1 ? "" : "s"} for ${goal.title} before adding new work.` : `Choose the next concrete milestone for ${goal.title} and schedule it this week.` },
    { priority: goal.progress < 50 ? "High" : "Medium", content: `Protect two focused sessions for ${goal.title}; update progress only after a completed deliverable.` },
    { priority: "Low", content: open.length ? `Keep the next milestone small: ${open[0].title}.` : "Add a measurable milestone with a target date to keep progress visible." },
  ]
}

export function studyTemplate(subjects: { name: string; exam_date: string; confidence: number }[], weeklyHours: number) {
  const ordered = [...subjects].sort((a, b) => a.confidence - b.confidence || a.exam_date.localeCompare(b.exam_date))
  const hours = Math.max(1, Math.round(weeklyHours * 10) / 10)
  return { title: "Rule-based study template", overview: "A capacity-aware template prioritized by confidence and exam date.", weekly_schedule: ordered.map((subject, index) => ({ week: "This week", focus: subject.name, total_hours: Math.round(hours / ordered.length * 10) / 10, sessions: [{ day: ["Monday", "Wednesday", "Saturday"][index % 3], subject: subject.name, topic: subject.confidence <= 2 ? "Core concepts and practice" : "Retrieval practice and review", hours: Math.round(hours / ordered.length * 10) / 10, method: "50-minute focus block + 10-minute recall" }] })), revision_plan: ordered.map((subject) => ({ subject: subject.name, strategy: "Review mistakes and complete one timed practice set.", last_week_actions: ["Create an error log", "Repeat weak questions"] })), recommendations: ["Start with the lowest-confidence subject.", "Reserve one weekly block for revision rather than new material."] }
}
