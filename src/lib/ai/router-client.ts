import type { Session } from "@supabase/supabase-js"

export type AIRequestType = "resume_review" | "personalized_study_plan" | "career_advice" | "reflection_analysis" | "interview_preparation" | "essay_improvement" | "communication_draft"
export type AIResult<T> = { data: T | null; source: "gpt" | "cache" | "rules"; fallback: boolean; message?: string }

/** The sole browser-to-AI boundary. It never throws: callers always receive a fallback result. */
export async function requestAI<T>(session: Session | null, requestType: AIRequestType, payload: unknown): Promise<AIResult<T>> {
  if (!session || !import.meta.env.VITE_SUPABASE_URL) return { data: null, source: "rules", fallback: true, message: "AI is unavailable; using workspace rules." }
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-router`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ requestType, payload }) })
    const body = await response.json().catch(() => null)
    if (!response.ok || !body) return { data: null, source: "rules", fallback: true, message: "AI is unavailable; using workspace rules." }
    return { data: body as T, source: body.source ?? "rules", fallback: Boolean(body.fallback), message: body.message }
  } catch { return { data: null, source: "rules", fallback: true, message: "AI is unavailable; using workspace rules." } }
}
