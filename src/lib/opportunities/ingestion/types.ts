import type { Opportunity, OpportunityType, VerificationState } from "../opportunityTypes"

export type SourceCapability =
  | "api"
  | "feed"
  | "structured_public_data"
  | "official_public_page"
  | "manual_verified"
  | "unsupported"

export type IngestionExecutionStatus =
  | "live_success"
  | "fallback_active"
  | "success"
  | "partial_success"
  | "empty_success"
  | "fetch_failed"
  | "parse_failed"
  | "validation_failed"
  | "rate_limited"
  | "unsupported"

export interface SourcePlatformMeta {
  id: string
  name: string
  baseUrl: string
  capability: SourceCapability
  isSupported: boolean
}

export interface RawOpportunityInput {
  title: string
  organization: string
  type: OpportunityType
  category: string
  description: string
  eligibility: string[]
  required_skills: string[]
  location: string
  stipend_prize?: string | null
  source_url: string
  source_platform: string
  source_record_id?: string | null
  registration_url?: string | null
  deadline?: string | null
  application_open_date?: string | null
  status?: "active" | "expired" | "archived"
  verification_state?: VerificationState
  content_hash?: string | null
  raw_metadata?: Record<string, unknown>
}

export interface StudentEligibilityResult {
  isEligible: boolean
  status: "verified" | "likely" | "unknown" | "not_eligible"
  reason: string
  matchedRules: string[]
  missingRules: string[]
}

export interface IngestionResult {
  platform: string
  capability: SourceCapability
  status: IngestionExecutionStatus
  isLive: boolean
  liveFetchedCount: number
  fallbackCount: number
  totalIngested: number
  totalNormalized: number
  acceptedCount: number
  duplicateCount: number
  rejectedCount: number
  errorCount: number
  errorSummary?: string | null
  durationMs: number
  opportunities: Opportunity[]
}

export interface IngestionRunLog {
  id?: string
  source_platform: string
  started_at: string
  finished_at?: string
  status: IngestionExecutionStatus
  fetched_count: number
  live_fetched_count: number
  fallback_count: number
  normalized_count: number
  accepted_count: number
  duplicate_count: number
  rejected_count: number
  error_count: number
  error_summary?: string | null
  metadata?: Record<string, unknown>
}
