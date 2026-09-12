export type OpportunityType = 'hackathon' | 'internship' | 'job' | 'fellowship' | 'grant' | 'competition' | 'ambassador'
export type OpportunityStatus = 'active' | 'expired' | 'archived'
export type VerificationState = 'verified' | 'pending' | 'deprecated'

export type ApplicationStatus =
  | 'saved'
  | 'interested'
  | 'applying'
  | 'applied'
  | 'interviewing'
  | 'accepted'
  | 'rejected'
  | 'withdrawn'
  | 'not_eligible'
  | 'deadline_passed'

export interface Opportunity {
  id: string
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
  event_start_date?: string | null
  event_end_date?: string | null
  team_size_min?: number | null
  team_size_max?: number | null
  source_record_id?: string | null
  registration_url?: string | null
  content_hash?: string | null
  first_seen_at?: string | null
  last_ingested_at?: string | null
  ingestion_status?: string | null
  raw_metadata?: Record<string, unknown> | null
  status: OpportunityStatus
  verification_state: VerificationState
  last_verified_at: string
  created_at: string
  updated_at: string
}

export interface OpportunityMatch {
  id: string
  user_id: string
  opportunity_id: string
  match_score: number
  skill_match_score: number
  goal_match_score: number
  strengths: string[]
  missing_skills: string[]
  explanation: string
  computed_at: string
}

export interface SavedOpportunity {
  user_id: string
  opportunity_id: string
  saved_at: string
}

export interface OpportunityApplication {
  id: string
  user_id: string
  opportunity_id: string
  status: ApplicationStatus
  applied_at?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface PrepPlanStep {
  week: string
  title: string
  focus: string
  action_items: string[]
}

export interface OpportunityPrepPlanData {
  summary: string
  readiness_assessment: string
  recommended_projects: string[]
  key_milestones: PrepPlanStep[]
  recommended_resources: string[]
  student_fingerprint?: string
}

export interface OpportunityPrepPlan {
  id: string
  user_id: string
  opportunity_id: string
  plan: OpportunityPrepPlanData
  created_at: string
  updated_at: string
}
