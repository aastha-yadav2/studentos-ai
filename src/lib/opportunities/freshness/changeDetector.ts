import type { Opportunity } from "../opportunityTypes"
import { extractCanonicalSnapshot } from "./canonicalSnapshot"
import type { OpportunityChangeEvent } from "./types"

export function detectOpportunityChanges(
  existingOpp: Opportunity,
  freshOpp: Opportunity,
  existingEvents: OpportunityChangeEvent[] = []
): OpportunityChangeEvent[] {
  const events: OpportunityChangeEvent[] = []
  const now = new Date().toISOString()
  const oppId = existingOpp.id
  const sourcePlatform = freshOpp.source_platform || existingOpp.source_platform
  const sourceUrl = freshOpp.source_url || existingOpp.source_url

  const oldSnap = extractCanonicalSnapshot(existingOpp)
  const newSnap = extractCanonicalSnapshot(freshOpp)

  // Helper to prevent duplicate historical event logging
  const isDuplicateEvent = (changeType: OpportunityChangeEvent["change_type"], fieldChanged: string, oldValue: string | null, newValue: string | null): boolean => {
    return existingEvents.some(
      (e) =>
        e.opportunity_id === oppId &&
        e.change_type === changeType &&
        e.field_changed === fieldChanged &&
        e.old_value === oldValue &&
        e.new_value === newValue
    )
  }

  // 1. Application Open Date Changed
  if (oldSnap.application_open_date !== newSnap.application_open_date) {
    if (!isDuplicateEvent("application_open_date_changed", "application_open_date", oldSnap.application_open_date, newSnap.application_open_date)) {
      events.push({
        id: `evt-opendate-${oppId}-${Date.now()}-${events.length}`,
        opportunity_id: oppId,
        source_platform: sourcePlatform,
        change_type: "application_open_date_changed",
        field_changed: "application_open_date",
        old_value: oldSnap.application_open_date,
        new_value: newSnap.application_open_date,
        summary: `Application open date for ${existingOpp.title} changed from ${existingOpp.application_open_date ?? "Unspecified"} to ${freshOpp.application_open_date ?? "Unspecified"}`,
        source_url: sourceUrl,
        detected_at: now,
      })
    }
  }

  // 2. Deadline Changed
  if (oldSnap.deadline !== newSnap.deadline) {
    if (!isDuplicateEvent("deadline_changed", "deadline", oldSnap.deadline, newSnap.deadline)) {
      events.push({
        id: `evt-deadline-${oppId}-${Date.now()}-${events.length}`,
        opportunity_id: oppId,
        source_platform: sourcePlatform,
        change_type: "deadline_changed",
        field_changed: "deadline",
        old_value: oldSnap.deadline,
        new_value: newSnap.deadline,
        summary: `Deadline for ${existingOpp.title} changed from ${existingOpp.deadline ?? "Unspecified"} to ${freshOpp.deadline ?? "Unspecified"}`,
        source_url: sourceUrl,
        detected_at: now,
      })
    }
  }

  // 3. Event Start Date Changed
  if (oldSnap.event_start_date !== newSnap.event_start_date) {
    if (!isDuplicateEvent("event_start_date_changed", "event_start_date", oldSnap.event_start_date, newSnap.event_start_date)) {
      events.push({
        id: `evt-startdate-${oppId}-${Date.now()}-${events.length}`,
        opportunity_id: oppId,
        source_platform: sourcePlatform,
        change_type: "event_start_date_changed",
        field_changed: "event_start_date",
        old_value: oldSnap.event_start_date,
        new_value: newSnap.event_start_date,
        summary: `Event start date for ${existingOpp.title} changed from ${existingOpp.event_start_date ?? "Unspecified"} to ${freshOpp.event_start_date ?? "Unspecified"}`,
        source_url: sourceUrl,
        detected_at: now,
      })
    }
  }

  // 4. Event End Date Changed
  if (oldSnap.event_end_date !== newSnap.event_end_date) {
    if (!isDuplicateEvent("event_end_date_changed", "event_end_date", oldSnap.event_end_date, newSnap.event_end_date)) {
      events.push({
        id: `evt-enddate-${oppId}-${Date.now()}-${events.length}`,
        opportunity_id: oppId,
        source_platform: sourcePlatform,
        change_type: "event_end_date_changed",
        field_changed: "event_end_date",
        old_value: oldSnap.event_end_date,
        new_value: newSnap.event_end_date,
        summary: `Event end date for ${existingOpp.title} changed from ${existingOpp.event_end_date ?? "Unspecified"} to ${freshOpp.event_end_date ?? "Unspecified"}`,
        source_url: sourceUrl,
        detected_at: now,
      })
    }
  }

  // 5. Status / Registration Opened & Closed
  if (oldSnap.status !== newSnap.status) {
    let changeType: OpportunityChangeEvent["change_type"] = "status_changed"

    if (oldSnap.status !== "active" && newSnap.status === "active") {
      changeType = "registration_opened"
    } else if (oldSnap.status === "active" && newSnap.status === "expired") {
      changeType = "registration_closed"
    }

    if (!isDuplicateEvent(changeType, "status", oldSnap.status, newSnap.status)) {
      events.push({
        id: `evt-status-${oppId}-${Date.now()}-${events.length}`,
        opportunity_id: oppId,
        source_platform: sourcePlatform,
        change_type: changeType,
        field_changed: "status",
        old_value: oldSnap.status,
        new_value: newSnap.status,
        summary: `Status for ${existingOpp.title} changed from ${oldSnap.status} to ${newSnap.status}`,
        source_url: sourceUrl,
        detected_at: now,
      })
    }
  }

  // 6. Verification State / Deprecation / Reactivation
  if (oldSnap.verification_state !== newSnap.verification_state) {
    let changeType: OpportunityChangeEvent["change_type"] = "status_changed"
    if (newSnap.verification_state === "deprecated") {
      changeType = "opportunity_deprecated"
    } else if (oldSnap.verification_state === "deprecated" && (newSnap.verification_state === "verified" || newSnap.verification_state === "pending")) {
      changeType = "opportunity_reactivated"
    }

    if (!isDuplicateEvent(changeType, "verification_state", oldSnap.verification_state, newSnap.verification_state)) {
      events.push({
        id: `evt-verify-${oppId}-${Date.now()}-${events.length}`,
        opportunity_id: oppId,
        source_platform: sourcePlatform,
        change_type: changeType,
        field_changed: "verification_state",
        old_value: oldSnap.verification_state,
        new_value: newSnap.verification_state,
        summary: `Verification state for ${existingOpp.title} updated from ${oldSnap.verification_state} to ${newSnap.verification_state}`,
        source_url: sourceUrl,
        detected_at: now,
      })
    }
  }

  // 7. Eligibility Changed (Order-insensitive comparison)
  const oldEligibilityStr = oldSnap.eligibility.join(" | ")
  const newEligibilityStr = newSnap.eligibility.join(" | ")
  if (oldEligibilityStr !== newEligibilityStr) {
    if (!isDuplicateEvent("eligibility_changed", "eligibility", oldEligibilityStr || null, newEligibilityStr || null)) {
      events.push({
        id: `evt-eligibility-${oppId}-${Date.now()}-${events.length}`,
        opportunity_id: oppId,
        source_platform: sourcePlatform,
        change_type: "eligibility_changed",
        field_changed: "eligibility",
        old_value: oldEligibilityStr || null,
        new_value: newEligibilityStr || null,
        summary: `Eligibility criteria updated for ${existingOpp.title}`,
        source_url: sourceUrl,
        detected_at: now,
      })
    }
  }

  // 8. Skills Changed (Order-insensitive comparison)
  const oldSkillsStr = oldSnap.required_skills.join(", ")
  const newSkillsStr = newSnap.required_skills.join(", ")
  if (oldSkillsStr !== newSkillsStr) {
    if (
      !isDuplicateEvent("skills_changed", "required_skills", oldSkillsStr || null, newSkillsStr || null) &&
      !isDuplicateEvent("required_skills_changed", "required_skills", oldSkillsStr || null, newSkillsStr || null)
    ) {
      events.push({
        id: `evt-skills-${oppId}-${Date.now()}-${events.length}`,
        opportunity_id: oppId,
        source_platform: sourcePlatform,
        change_type: "skills_changed",
        field_changed: "required_skills",
        old_value: oldSkillsStr || null,
        new_value: newSkillsStr || null,
        summary: `Required skills updated for ${existingOpp.title}`,
        source_url: sourceUrl,
        detected_at: now,
      })
    }
  }

  // 9. Location / Mode Changed
  if (oldSnap.location !== newSnap.location || oldSnap.mode !== newSnap.mode) {
    const oldLocVal = `${oldSnap.location} (${oldSnap.mode})`
    const newLocVal = `${newSnap.location} (${newSnap.mode})`
    if (!isDuplicateEvent("location_changed", "location", oldLocVal, newLocVal)) {
      events.push({
        id: `evt-location-${oppId}-${Date.now()}-${events.length}`,
        opportunity_id: oppId,
        source_platform: sourcePlatform,
        change_type: "location_changed",
        field_changed: "location",
        old_value: oldLocVal,
        new_value: newLocVal,
        summary: `Location for ${existingOpp.title} changed from ${existingOpp.location} to ${freshOpp.location}`,
        source_url: sourceUrl,
        detected_at: now,
      })
    }
  }

  // 10. Team Size Changed
  if (oldSnap.team_size_min !== newSnap.team_size_min || oldSnap.team_size_max !== newSnap.team_size_max) {
    const oldTeamVal = oldSnap.team_size_min || oldSnap.team_size_max ? `${oldSnap.team_size_min ?? 1}-${oldSnap.team_size_max ?? "N/A"}` : null
    const newTeamVal = newSnap.team_size_min || newSnap.team_size_max ? `${newSnap.team_size_min ?? 1}-${newSnap.team_size_max ?? "N/A"}` : null

    if (!isDuplicateEvent("team_size_changed", "team_size", oldTeamVal, newTeamVal)) {
      events.push({
        id: `evt-teamsize-${oppId}-${Date.now()}-${events.length}`,
        opportunity_id: oppId,
        source_platform: sourcePlatform,
        change_type: "team_size_changed",
        field_changed: "team_size",
        old_value: oldTeamVal,
        new_value: newTeamVal,
        summary: `Team size requirements updated for ${existingOpp.title}`,
        source_url: sourceUrl,
        detected_at: now,
      })
    }
  }

  // 11. Prize / Stipend Changed
  if (oldSnap.stipend_prize !== newSnap.stipend_prize) {
    if (!isDuplicateEvent("prize_changed", "stipend_prize", oldSnap.stipend_prize, newSnap.stipend_prize)) {
      events.push({
        id: `evt-prize-${oppId}-${Date.now()}-${events.length}`,
        opportunity_id: oppId,
        source_platform: sourcePlatform,
        change_type: "prize_changed",
        field_changed: "stipend_prize",
        old_value: oldSnap.stipend_prize,
        new_value: newSnap.stipend_prize,
        summary: `Prize/stipend information for ${existingOpp.title} updated`,
        source_url: sourceUrl,
        detected_at: now,
      })
    }
  }

  // 12. Source Platform or URL Changed
  if (oldSnap.source_platform !== newSnap.source_platform || oldSnap.source_url !== newSnap.source_url) {
    const oldSrcVal = `${existingOpp.source_platform} (${existingOpp.source_url})`
    const newSrcVal = `${freshOpp.source_platform} (${freshOpp.source_url})`
    if (!isDuplicateEvent("source_changed", "source", oldSrcVal, newSrcVal)) {
      events.push({
        id: `evt-source-${oppId}-${Date.now()}-${events.length}`,
        opportunity_id: oppId,
        source_platform: freshOpp.source_platform,
        change_type: "source_changed",
        field_changed: "source",
        old_value: oldSrcVal,
        new_value: newSrcVal,
        summary: `Source info for ${existingOpp.title} changed from ${existingOpp.source_platform} to ${freshOpp.source_platform}`,
        source_url: freshOpp.source_url,
        detected_at: now,
      })
    }
  }

  return events
}
