import { supabase } from "@/lib/supabase"
import { requestAI } from "@/lib/ai/router-client"
import type { CoachingMessage, ReflectionMetrics } from "./types"

const db = () => { if (!supabase) throw new Error("Supabase is not configured."); return supabase }

export const coachingService = {
  async latest(userId: string) { const { data, error } = await db().from("coaching_messages").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(); if (error) throw error; return data as CoachingMessage | null },
  async generate(userId: string, metrics: ReflectionMetrics) { const { data: { session } } = await db().auth.getSession(); const result = await requestAI<{ content: string }>(session, "reflection_coaching", { metrics, instruction: "Return JSON with message_type (burnout, focus, encouragement, or productivity), message, and rationale. Be concise and base every claim on the supplied metrics." }); const coaching = JSON.parse(result.data.content) as Pick<CoachingMessage, "message_type" | "message" | "rationale">; if (!coaching.message || !coaching.rationale || !coaching.message_type) throw new Error("Gemini returned an incomplete coaching response."); const { data, error } = await db().from("coaching_messages").insert({ user_id: userId, ...coaching }).select("*").single(); if (error) throw error; return data as CoachingMessage },
}
