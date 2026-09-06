import type { Opportunity } from "../opportunityTypes"
import type { OpportunityChangeEvent } from "./types"

export function detectOpportunityChanges(
  existingOpp: Opportunity,
  freshOpp: Opportunity
): OpportunityChangeEvent[] {
  const events: OpportunityChangeEvent[] = []
  const now = new Date().toISOString()
  const oppId = existingOpp.id

  // 1. Deadline Changed
  if (existingOpp.deadline !== freshOpp.deadline) {
    events.push({
      id: `evt-deadline-${oppId}-${Date.now()}`,
      opportunity_id: oppId,
      change_type: "deadline_changed",
      field_changed: "deadline",
      old_value: existingOpp.deadline ?? null,
      new_value: freshOpp.deadline ?? null,
      summary: `Deadline updated for ${existingOpp.title} from ${existingOpp.deadline ?? "Unspecified"} to ${freshOpp.deadline ?? "Unspecified"}`,
      detected_at: now,
    })
  }

  // 2. Application Open Date Changed
  if (existingOpp.application_open_date !== freshOpp.application_open_date) {
    events.push({
      id: `evt-open-date-${oppId}-${Date.now()}`,
      opportunity_id: oppId,
      change_type: "application_open_date_changed",
      field_changed: "application_open_date",
      old_value: existingOpp.application_open_date ?? null,
      new_value: freshOpp.application_open_date ?? null,
      summary: `Application open date updated for ${existingOpp.title} to ${freshOpp.application_open_date ?? "Unspecified"}`,
      detected_at: now,
    })
  }

  // 3. Status Changed / Registration Opened / Closed
  if (existingOpp.status !== freshOpp.status) {
    let changeType: OpportunityChangeEvent["change_type"] = "status_changed"
    if (existingOpp.status !== "active" && freshOpp.status === "active") {
      changeType = "registration_opened"
    } else if (existingOpp.status === "active" && freshOpp.status === "expired") {
      changeType = "registration_closed"
    }

    events.push({
      id: `evt-status-${oppId}-${Date.now()}`,
      opportunity_id: oppId,
      change_type: changeType,
      field_changed: "status",
      old_value: existingOpp.status,
      new_value: freshOpp.status,
      summary: `Status for ${existingOpp.title} changed from ${existingOpp.status} to ${freshOpp.status}`,
      detected_at: now,
    })
  }

  // 4. Verification State Changed / Became Deprecated
  if (existingOpp.verification_state !== freshOpp.verification_state) {
    const isDeprecated = freshOpp.verification_state === "deprecated"
    events.push({
      id: `evt-verify-${oppId}-${Date.now()}`,
      opportunity_id: oppId,
      change_type: isDeprecated ? "became_deprecated" : "status_changed",
      field_changed: "verification_state",
      old_value: existingOpp.verification_state,
      new_value: freshOpp.verification_state,
      summary: `Verification state for ${existingOpp.title} updated to ${freshOpp.verification_state}`,
      detected_at: now,
    })
  }

  // 5. Eligibility Rules Changed
  const oldEligibilityStr = (existingOpp.eligibility ?? []).slice().sort().join(" | ")
  const freshEligibilityStr = (freshOpp.eligibility ?? []).slice().sort().join(" | ")
  if (oldEligibilityStr !== freshEligibilityStr) {
    events.push({
      id: `evt-eligibility-${oppId}-${Date.now()}`,
      opportunity_id: oppId,
      change_type: "eligibility_changed",
      field_changed: "eligibility",
      old_value: oldEligibilityStr || null,
      new_value: freshEligibilityStr || null,
      summary: `Eligibility criteria updated for ${existingOpp.title}`,
      detected_at: now,
    })
  }

  // 6. Required Skills Changed
  const oldSkillsStr = (existingOpp.required_skills ?? []).slice().sort().join(", ")
  const freshSkillsStr = (freshOpp.required_skills ?? []).slice().sort().join(", ")
  if (oldSkillsStr !== freshSkillsStr) {
    events.push({
      id: `evt-skills-${oppId}-${Date.now()}`,
      opportunity_id: oppId,
      change_type: "required_skills_changed",
      field_changed: "required_skills",
      old_value: oldSkillsStr || null,
      new_value: freshSkillsStr || null,
      summary: `Required skills updated for ${existingOpp.title}`,
      detected_at: now,
    })
  }

  return events
}
