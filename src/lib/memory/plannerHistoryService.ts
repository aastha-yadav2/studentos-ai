import { supabase } from "@/lib/supabase"
import type { PlannerHistoryItem, PlannerInteraction } from "./types"

function client() { if (!supabase) throw new Error("Supabase is not configured."); return supabase }
export const plannerHistoryService = {
  async list(userId: string, limit = 8) { const { data, error } = await client().from("planner_runs").select("id,title,goal,goal_type,plan,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit); if (error) throw error; return (data ?? []) as PlannerHistoryItem[] },
  async interactions(userId: string, limit = 12) { const { data, error } = await client().from("planner_interactions").select("id,planner_run_id,interaction_type,summary,content,meaningful,created_at").eq("user_id", userId).eq("meaningful", true).order("created_at", { ascending: false }).limit(limit); if (error) throw error; return (data ?? []) as PlannerInteraction[] },
  async record(userId: string, interaction: Omit<PlannerInteraction, "id" | "created_at">) { const { error } = await client().from("planner_interactions").insert({ user_id: userId, ...interaction }); if (error) throw error },
}
