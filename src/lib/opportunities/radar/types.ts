import type { Opportunity, OpportunityMatch } from "../opportunityTypes"

export type RadarActionType =
  | "view_opportunity"
  | "prepare_application"
  | "continue_prep"
  | "track_application"
  | "watchlist"

export interface RadarAction {
  label: string
  action_type: RadarActionType
  href: string
}

export interface RadarReasonChip {
  label: string
  variant?: "primary" | "warning" | "success" | "muted"
}

export interface RadarPriorityScore {
  priorityScore: number
  matchScore: number
  urgencyScore: number
  recencyScore: number
  actionabilityScore: number
  sourceScore: number
}

export interface RadarItem {
  opportunity: Opportunity
  match: OpportunityMatch | null
  priority: RadarPriorityScore
  reasonChips: RadarReasonChip[]
  primaryAction: RadarAction
  lifecycleState: "not_saved" | "saved" | "applied" | "prep_incomplete" | "closed"
}

export interface RadarResult {
  primaryRecommendation: RadarItem | null
  applyNow: RadarItem[]
  bestMatches: RadarItem[]
  deadlineSoon: RadarItem[]
  newlyOpened: RadarItem[]
  ambassadors: RadarItem[]
  prepareNext: RadarItem[]
  watchlist: RadarItem[]
  totalEvaluated: number
  generatedAt: string
}
