import { supabase } from "@/lib/supabase"
import type {
  Opportunity,
  OpportunityMatch,
  SavedOpportunity,
  OpportunityApplication,
  OpportunityPrepPlan,
  ApplicationStatus,
} from "./opportunityTypes"

export async function fetchOpportunities(): Promise<Opportunity[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .eq("status", "active")
    .order("last_verified_at", { ascending: false })

  if (error) {
    console.error("Error fetching opportunities:", error)
    return []
  }
  return data as Opportunity[]
}

export async function fetchUserSavedOpportunities(userId: string): Promise<SavedOpportunity[]> {
  if (!supabase || !userId) return []
  const { data, error } = await supabase
    .from("user_opportunity_saved")
    .select("*")
    .eq("user_id", userId)

  if (error) {
    console.error("Error fetching saved opportunities:", error)
    return []
  }
  return data as SavedOpportunity[]
}

export async function toggleSaveOpportunity(userId: string, opportunityId: string, isSaved: boolean): Promise<boolean> {
  if (!supabase || !userId) return false
  if (isSaved) {
    const { error } = await supabase
      .from("user_opportunity_saved")
      .delete()
      .eq("user_id", userId)
      .eq("opportunity_id", opportunityId)
    return !error
  } else {
    const { error } = await supabase
      .from("user_opportunity_saved")
      .insert({ user_id: userId, opportunity_id: opportunityId })
    return !error
  }
}

export async function fetchUserApplications(userId: string): Promise<OpportunityApplication[]> {
  if (!supabase || !userId) return []
  const { data, error } = await supabase
    .from("user_opportunity_applications")
    .select("*")
    .eq("user_id", userId)

  if (error) {
    console.error("Error fetching user applications:", error)
    return []
  }
  return data as OpportunityApplication[]
}

export async function updateApplicationStatus(
  userId: string,
  opportunityId: string,
  status: ApplicationStatus,
  notes?: string
): Promise<OpportunityApplication | null> {
  if (!supabase || !userId) return null
  const payload = {
    user_id: userId,
    opportunity_id: opportunityId,
    status,
    notes: notes ?? null,
    applied_at: status === "applied" ? new Date().toISOString() : null,
  }

  const { data, error } = await supabase
    .from("user_opportunity_applications")
    .upsert(payload, { onConflict: "user_id,opportunity_id" })
    .select()
    .single()

  if (error) {
    console.error("Error updating application status:", error)
    return null
  }
  return data as OpportunityApplication
}

export async function fetchUserOpportunityMatches(userId: string): Promise<OpportunityMatch[]> {
  if (!supabase || !userId) return []
  const { data, error } = await supabase
    .from("opportunity_matches")
    .select("*")
    .eq("user_id", userId)

  if (error) {
    console.error("Error fetching opportunity matches:", error)
    return []
  }
  return data as OpportunityMatch[]
}

export async function saveOpportunityMatch(match: Omit<OpportunityMatch, "id" | "computed_at">): Promise<OpportunityMatch | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from("opportunity_matches")
    .upsert(match, { onConflict: "user_id,opportunity_id" })
    .select()
    .single()

  if (error) {
    console.error("Error saving opportunity match:", error)
    return null
  }
  return data as OpportunityMatch
}

export async function fetchUserPrepPlans(userId: string): Promise<OpportunityPrepPlan[]> {
  if (!supabase || !userId) return []
  const { data, error } = await supabase
    .from("opportunity_prep_plans")
    .select("*")
    .eq("user_id", userId)

  if (error) {
    console.error("Error fetching prep plans:", error)
    return []
  }
  return data as OpportunityPrepPlan[]
}

export async function saveOpportunityPrepPlan(prepPlan: Omit<OpportunityPrepPlan, "id" | "created_at" | "updated_at">): Promise<OpportunityPrepPlan | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from("opportunity_prep_plans")
    .upsert(prepPlan, { onConflict: "user_id,opportunity_id" })
    .select()
    .single()

  if (error) {
    console.error("Error saving prep plan:", error)
    return null
  }
  return data as OpportunityPrepPlan
}
