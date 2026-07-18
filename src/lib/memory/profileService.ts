import { supabase } from "@/lib/supabase"
import type { MemoryProfile } from "./types"

function client() { if (!supabase) throw new Error("Supabase is not configured."); return supabase }
export const profileService = {
  async get(userId: string) { const { data, error } = await client().from("user_memory_profiles").select("*").eq("user_id", userId).maybeSingle(); if (error) throw error; return data as MemoryProfile | null },
  async save(userId: string, profile: Omit<MemoryProfile, "user_id" | "updated_at">) { const { data, error } = await client().from("user_memory_profiles").upsert({ user_id: userId, ...profile, updated_at: new Date().toISOString() }).select("*").single(); if (error) throw error; return data as MemoryProfile },
}
