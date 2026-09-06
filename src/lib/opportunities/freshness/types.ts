import type { Opportunity } from "../opportunityTypes"

export type OpportunityChangeType =
  | "registration_opened"
  | "registration_closed"
  | "deadline_changed"
  | "application_open_date_changed"
  | "status_changed"
  | "eligibility_changed"
  | "required_skills_changed"
  | "became_deprecated"
  | "new_opportunity_discovered"

export interface OpportunityChangeEvent {
  id: string
  opportunity_id: string
  change_type: OpportunityChangeType
  field_changed: string
  old_value: string | null
  new_value: string | null
  summary: string
  detected_at: string
}

export interface FreshnessVerificationResult {
  opportunity_id: string
  opportunity_title: string
  has_changes: boolean
  changes: OpportunityChangeEvent[]
  updated_opportunity: Opportunity
  last_verified_at: string
}

export interface AuditReport {
  total_checked: number
  total_changed: number
  total_new_discovered: number
  events_generated: OpportunityChangeEvent[]
  audit_timestamp: string
}
