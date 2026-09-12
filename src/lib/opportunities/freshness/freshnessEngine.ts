import type { Opportunity } from "../opportunityTypes"
import { detectOpportunityChanges } from "./changeDetector"
import type { AuditReport, FreshnessVerificationResult, OpportunityChangeEvent } from "./types"

export const SOURCE_PRIORITY_MAP: Record<string, number> = {
  official_organizer: 1,
  google: 1,
  microsoft: 1,
  github: 1,
  sih: 1,
  "smart india hackathon": 1,
  official_platform: 2,
  devpost: 2,
  devfolio: 2,
  unstop: 2,
  hackerearth: 2,
  hack2skill: 2,
  trusted_public: 3,
  hackhazard: 3,
  manual_verified: 4,
  curated: 4,
}

export function getSourcePriority(platform: string): number {
  const clean = platform.trim().toLowerCase()
  return SOURCE_PRIORITY_MAP[clean] ?? 3
}

export function verifyOpportunityFreshness(
  existingOpp: Opportunity,
  freshState: Opportunity | null | undefined,
  options?: {
    existingEvents?: OpportunityChangeEvent[]
    sourceFetchError?: boolean
    parserError?: boolean
    sourcePriorityOverride?: number
  }
): FreshnessVerificationResult {
  const lastVerified = new Date().toISOString()

  // ── 1. SOURCE FAILURE SAFETY ──────────────────────────────────────────────
  // If fetch failed, parser failed, or payload is invalid/empty: PRESERVE CANONICAL STATE
  if (options?.sourceFetchError || options?.parserError || !freshState || !freshState.title) {
    return {
      opportunity_id: existingOpp.id,
      opportunity_title: existingOpp.title,
      has_changes: false,
      success: false,
      error: options?.sourceFetchError
        ? "Source fetch failed or timed out. Preserved last known canonical record."
        : "Source payload empty or malformed. Preserved last known canonical record.",
      changes: [],
      updated_opportunity: existingOpp, // Retain last_verified_at intact
      last_verified_at: existingOpp.last_verified_at,
    }
  }

  // ── 2. MULTI-SOURCE PRIORITY CONFLICT HANDLING ─────────────────────────────
  const existingPriority = getSourcePriority(existingOpp.source_platform)
  const freshPriority = options?.sourcePriorityOverride ?? getSourcePriority(freshState.source_platform)

  // Lower priority number = higher authority (1 is top priority).
  // If incoming source is lower authority (higher priority number) than existing verified state:
  if (freshPriority > existingPriority) {
    // Preserve higher-priority verified fields (e.g. deadline, eligibility, skills)
    freshState = {
      ...freshState,
      deadline: existingOpp.deadline ?? freshState.deadline,
      application_open_date: existingOpp.application_open_date ?? freshState.application_open_date,
      eligibility: existingOpp.eligibility.length > 0 ? existingOpp.eligibility : freshState.eligibility,
      required_skills: existingOpp.required_skills.length > 0 ? existingOpp.required_skills : freshState.required_skills,
    }
  }

  // ── 3. SEMANTIC CHANGE DETECTION ───────────────────────────────────────────
  const changes = detectOpportunityChanges(existingOpp, freshState, options?.existingEvents ?? [])

  const updatedOpp: Opportunity = {
    ...existingOpp,
    title: freshState.title,
    organization: freshState.organization,
    category: freshState.category,
    description: freshState.description,
    eligibility: freshState.eligibility,
    required_skills: freshState.required_skills,
    location: freshState.location,
    stipend_prize: freshState.stipend_prize,
    deadline: freshState.deadline,
    application_open_date: freshState.application_open_date,
    event_start_date: freshState.event_start_date ?? existingOpp.event_start_date,
    event_end_date: freshState.event_end_date ?? existingOpp.event_end_date,
    team_size_min: freshState.team_size_min ?? existingOpp.team_size_min,
    team_size_max: freshState.team_size_max ?? existingOpp.team_size_max,
    status: freshState.status,
    verification_state: freshState.verification_state,
    last_verified_at: lastVerified,
    updated_at: changes.length > 0 ? lastVerified : existingOpp.updated_at,
  }

  return {
    opportunity_id: existingOpp.id,
    opportunity_title: existingOpp.title,
    has_changes: changes.length > 0,
    success: true,
    changes,
    updated_opportunity: updatedOpp,
    last_verified_at: lastVerified,
  }
}

export function isMatchCacheInvalidatedByChanges(changes: OpportunityChangeEvent[]): boolean {
  const matchingRelevantFields = new Set([
    "eligibility",
    "required_skills",
    "skills",
    "location",
    "team_size",
    "status",
    "deadline",
  ])
  return changes.some((c) => matchingRelevantFields.has(c.field_changed))
}

export function runCatalogFreshnessAudit(
  existingCatalog: Opportunity[],
  freshIngestedCatalog: (Opportunity | null)[],
  options?: { existingEvents?: OpportunityChangeEvent[] }
): { updatedCatalog: Opportunity[]; auditReport: AuditReport } {
  const existingMap = new Map<string, Opportunity>()
  for (const opp of existingCatalog) {
    const key = `${opp.source_platform.toLowerCase()}|${opp.source_url.toLowerCase().replace(/\/$/, "")}`
    existingMap.set(key, opp)
  }

  const updatedCatalog: Opportunity[] = []
  const allEvents: OpportunityChangeEvent[] = []
  let totalChanged = 0
  let totalNew = 0
  let totalFailed = 0

  for (const fresh of freshIngestedCatalog) {
    if (!fresh) {
      totalFailed++
      continue
    }

    const key = `${fresh.source_platform.toLowerCase()}|${fresh.source_url.toLowerCase().replace(/\/$/, "")}`
    const existing = existingMap.get(key)

    if (existing) {
      const result = verifyOpportunityFreshness(existing, fresh, { existingEvents: options?.existingEvents })
      updatedCatalog.push(result.updated_opportunity)
      if (!result.success) {
        totalFailed++
      } else if (result.has_changes) {
        totalChanged++
        allEvents.push(...result.changes)
      }
      existingMap.delete(key)
    } else {
      // New opportunity discovered safely
      totalNew++
      const newEvent: OpportunityChangeEvent = {
        id: `evt-new-${fresh.id}-${Date.now()}-${allEvents.length}`,
        opportunity_id: fresh.id,
        source_platform: fresh.source_platform,
        change_type: "new_opportunity_discovered",
        field_changed: "opportunity",
        old_value: null,
        new_value: fresh.title,
        summary: `New opportunity discovered: ${fresh.title} (${fresh.organization})`,
        source_url: fresh.source_url,
        detected_at: new Date().toISOString(),
      }
      allEvents.push(newEvent)
      updatedCatalog.push(fresh)
    }
  }

  // Preserve remaining un-ingested existing opportunities safely
  for (const remaining of existingMap.values()) {
    updatedCatalog.push(remaining)
  }

  const auditReport: AuditReport = {
    total_checked: freshIngestedCatalog.length,
    total_changed: totalChanged,
    total_new_discovered: totalNew,
    total_failed: totalFailed,
    events_generated: allEvents,
    audit_timestamp: new Date().toISOString(),
  }

  return { updatedCatalog, auditReport }
}
