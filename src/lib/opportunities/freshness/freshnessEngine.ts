import type { Opportunity } from "../opportunityTypes"
import { detectOpportunityChanges } from "./changeDetector"
import type { AuditReport, FreshnessVerificationResult, OpportunityChangeEvent } from "./types"

export function verifyOpportunityFreshness(
  existingOpp: Opportunity,
  freshState: Opportunity
): FreshnessVerificationResult {
  const changes = detectOpportunityChanges(existingOpp, freshState)
  const lastVerified = new Date().toISOString()

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
    status: freshState.status,
    verification_state: freshState.verification_state,
    last_verified_at: lastVerified,
    updated_at: changes.length > 0 ? lastVerified : existingOpp.updated_at,
  }

  return {
    opportunity_id: existingOpp.id,
    opportunity_title: existingOpp.title,
    has_changes: changes.length > 0,
    changes,
    updated_opportunity: updatedOpp,
    last_verified_at: lastVerified,
  }
}

export function runCatalogFreshnessAudit(
  existingCatalog: Opportunity[],
  freshIngestedCatalog: Opportunity[]
): { updatedCatalog: Opportunity[]; auditReport: AuditReport } {
  const existingMap = new Map<string, Opportunity>()
  for (const opp of existingCatalog) {
    const key = `${opp.source_platform.toLowerCase()}|${opp.source_url.toLowerCase()}`
    existingMap.set(key, opp)
  }

  const updatedCatalog: Opportunity[] = []
  const allEvents: OpportunityChangeEvent[] = []
  let totalChanged = 0
  let totalNew = 0

  for (const fresh of freshIngestedCatalog) {
    const key = `${fresh.source_platform.toLowerCase()}|${fresh.source_url.toLowerCase()}`
    const existing = existingMap.get(key)

    if (existing) {
      const result = verifyOpportunityFreshness(existing, fresh)
      updatedCatalog.push(result.updated_opportunity)
      if (result.has_changes) {
        totalChanged++
        allEvents.push(...result.changes)
      }
      existingMap.delete(key)
    } else {
      // New opportunity discovered
      totalNew++
      const newEvent: OpportunityChangeEvent = {
        id: `evt-new-${fresh.id}-${Date.now()}`,
        opportunity_id: fresh.id,
        change_type: "new_opportunity_discovered",
        field_changed: "opportunity",
        old_value: null,
        new_value: fresh.title,
        summary: `New opportunity discovered: ${fresh.title} (${fresh.organization})`,
        detected_at: new Date().toISOString(),
      }
      allEvents.push(newEvent)
      updatedCatalog.push(fresh)
    }
  }

  // Include remaining existing opportunities updated with fresh verification timestamp
  for (const remaining of existingMap.values()) {
    updatedCatalog.push({
      ...remaining,
      last_verified_at: new Date().toISOString(),
    })
  }

  const auditReport: AuditReport = {
    total_checked: freshIngestedCatalog.length,
    total_changed: totalChanged,
    total_new_discovered: totalNew,
    events_generated: allEvents,
    audit_timestamp: new Date().toISOString(),
  }

  return { updatedCatalog, auditReport }
}
