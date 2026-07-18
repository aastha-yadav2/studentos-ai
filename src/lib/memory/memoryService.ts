import { supabase } from "@/lib/supabase"
import type { MemoryEntry, MemoryType } from "./types"

function client() { if (!supabase) throw new Error("Supabase is not configured."); return supabase }
export const memoryService = {
  async list(userId: string, options: { type?: MemoryType; includeArchived?: boolean; limit?: number } = {}) { let query = client().from("ai_memory_entries").select("*").eq("user_id", userId).order("updated_at", { ascending: false }).limit(options.limit ?? 50); if (options.type) query = query.eq("memory_type", options.type); if (!options.includeArchived) query = query.eq("status", "active"); const { data, error } = await query; if (error) throw error; return (data ?? []) as MemoryEntry[] },
  async create(userId: string, entry: Pick<MemoryEntry, "memory_type" | "summary" | "content" | "source" | "importance">) { const { data, error } = await client().from("ai_memory_entries").insert({ user_id: userId, ...entry }).select("*").single(); if (error) throw error; return data as MemoryEntry },
  async update(id: string, userId: string, changes: Partial<Pick<MemoryEntry, "summary" | "content" | "importance" | "status">>) { const { data, error } = await client().from("ai_memory_entries").update({ ...changes, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId).select("*").single(); if (error) throw error; return data as MemoryEntry },
  async archive(id: string, userId: string) { return this.update(id, userId, { status: "archived" }) },
  async remove(id: string, userId: string) { const { error } = await client().from("ai_memory_entries").delete().eq("id", id).eq("user_id", userId); if (error) throw error },
  async reset(userId: string) { const db = client(); const [entries, interactions, preferences, profile] = await Promise.all([db.from("ai_memory_entries").delete().eq("user_id", userId), db.from("planner_interactions").delete().eq("user_id", userId), db.from("learned_preferences").delete().eq("user_id", userId), db.from("user_memory_profiles").delete().eq("user_id", userId)]); const error = entries.error ?? interactions.error ?? preferences.error ?? profile.error; if (error) throw error },
}
