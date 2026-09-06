import type { Opportunity, OpportunityType, VerificationState } from "../opportunityTypes"

export type SourceCapability =
  | "api"
  | "feed"
  | "structured_public_data"
  | "official_public_page"
  | "manual_verified"
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
  deadline?: string | null
  application_open_date?: string | null
  status?: "active" | "expired" | "archived"
  verification_state?: VerificationState
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
  totalIngested: number
  totalNormalized: number
  opportunities: Opportunity[]
}
