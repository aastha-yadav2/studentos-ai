import type { Opportunity } from "../opportunityTypes"
import { normalizeSkill } from "../skillNormalization"

export interface OpportunitySnapshot {
  title: string
  organization: string
  type: string
  category: string
  description: string
  eligibility: string[]
  required_skills: string[]
  location: string
  mode: "remote" | "hybrid" | "onsite"
  stipend_prize: string | null
  source_url: string
  source_platform: string
  deadline: string | null
  application_open_date: string | null
  event_start_date: string | null
  event_end_date: string | null
  team_size_min: number | null
  team_size_max: number | null
  status: string
  verification_state: string
}

export function normalizeDateString(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null
  const trimmed = dateStr.trim()
  if (!trimmed) return null
  try {
    const parsed = new Date(trimmed)
    if (isNaN(parsed.getTime())) return trimmed.toLowerCase()
    return parsed.toISOString()
  } catch {
    return trimmed.toLowerCase()
  }
}

export function normalizeUrl(url: string | null | undefined): string {
  if (!url) return ""
  return url.trim().replace(/\/+$/, "").toLowerCase()
}

export function normalizeStringArray(arr: string[] | null | undefined): string[] {
  if (!arr) return []
  const cleaned = arr
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
  return Array.from(new Set(cleaned)).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
}

export function normalizeSkillsArray(skills: string[] | null | undefined): string[] {
  if (!skills) return []
  const normalized = skills
    .map((s) => {
      const clean = s.trim()
      const norm = normalizeSkill(clean)
      return norm ? norm.toLowerCase() : clean.toLowerCase()
    })
    .filter((s) => s.length > 0)
  return Array.from(new Set(normalized)).sort()
}

export function normalizeLocation(loc: string | null | undefined): { location: string; mode: "remote" | "hybrid" | "onsite" } {
  if (!loc) return { location: "remote / global", mode: "remote" }
  const clean = loc.trim().replace(/\s+/g, " ")
  const lower = clean.toLowerCase()

  let mode: "remote" | "hybrid" | "onsite" = "onsite"
  if (lower.includes("remote") || lower.includes("online") || lower.includes("virtual") || lower.includes("global")) {
    mode = lower.includes("hybrid") ? "hybrid" : "remote"
  } else if (lower.includes("hybrid")) {
    mode = "hybrid"
  }

  return { location: clean, mode }
}

export function normalizePrize(prize: string | null | undefined): string | null {
  if (!prize) return null
  const clean = prize.trim().replace(/\s+/g, " ")
  return clean.length > 0 ? clean : null
}

export function extractCanonicalSnapshot(opp: Opportunity): OpportunitySnapshot {
  const { location, mode } = normalizeLocation(opp.location)

  return {
    title: opp.title.trim(),
    organization: opp.organization.trim(),
    type: opp.type,
    category: opp.category.trim(),
    description: opp.description.trim().replace(/\s+/g, " "),
    eligibility: normalizeStringArray(opp.eligibility),
    required_skills: normalizeSkillsArray(opp.required_skills),
    location,
    mode,
    stipend_prize: normalizePrize(opp.stipend_prize),
    source_url: normalizeUrl(opp.source_url),
    source_platform: opp.source_platform.trim(),
    deadline: normalizeDateString(opp.deadline),
    application_open_date: normalizeDateString(opp.application_open_date),
    event_start_date: normalizeDateString(opp.event_start_date),
    event_end_date: normalizeDateString(opp.event_end_date),
    team_size_min: opp.team_size_min ?? null,
    team_size_max: opp.team_size_max ?? null,
    status: opp.status,
    verification_state: opp.verification_state,
  }
}
