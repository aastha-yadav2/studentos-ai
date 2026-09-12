import type { Opportunity } from "../opportunityTypes"

export type OpportunityChangeType =
  | "registration_opened"
  | "registration_closed"
  | "application_open_date_changed"
  | "deadline_changed"
  | "event_start_date_changed"
  | "event_end_date_changed"
  | "status_changed"
  | "eligibility_changed"
  | "skills_changed"
  | "required_skills_changed"
  | "location_changed"
  | "team_size_changed"
  | "prize_changed"
  | "opportunity_deprecated"
  | "opportunity_reactivated"
  | "source_changed"
  | "new_opportunity_discovered"

export interface OpportunityChangeEvent {
  id: string
  opportunity_id: string
  source_platform?: string | null
  change_type: OpportunityChangeType
  field_changed: string
  old_value: string | null
  new_value: string | null
  summary: string
  source_url?: string | null
  metadata?: Record<string, unknown> | null
  detected_at: string
  created_at?: string
}

export interface FreshnessVerificationResult {
  opportunity_id: string
  opportunity_title: string
  has_changes: boolean
  success: boolean
  changes: OpportunityChangeEvent[]
  updated_opportunity: Opportunity
  last_verified_at: string
  error?: string
}

export interface AuditReport {
  total_checked: number
  total_changed: number
  total_new_discovered: number
  total_failed: number
  events_generated: OpportunityChangeEvent[]
  audit_timestamp: string
}
