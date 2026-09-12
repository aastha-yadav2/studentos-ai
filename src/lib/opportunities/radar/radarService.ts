import type {
  Opportunity,
  OpportunityApplication,
  OpportunityMatch,
  SavedOpportunity,
  ApplicationStatus,
} from "../opportunityTypes"
import type { StudentContextPayload, ComprehensiveMatchResult } from "../opportunityAIService"
import { calculateDeterministicMatch } from "../deterministicMatcher"
import { evaluateStudentEligibility } from "../ingestion/eligibilityExtractor"
import type { OpportunityChangeEvent } from "../freshness/types"
import type { RadarItem, RadarPriorityScore, RadarReasonChip, RadarResult } from "./types"
import { getSourcePriority } from "../freshness/freshnessEngine"

export const RADAR_RECENCY_WINDOW_MS = 14 * 24 * 60 * 60 * 1000 // 14 Days

export function calculateDeadlineUrgencyScore(deadlineIso: string | null | undefined, nowMs: number = Date.now()): number {
  if (!deadlineIso) return 0
  const deadlineMs = new Date(deadlineIso).getTime()
  if (isNaN(deadlineMs) || deadlineMs <= nowMs) return 0

  const diffHours = (deadlineMs - nowMs) / (1000 * 60 * 60)
  if (diffHours <= 48) return 100
  if (diffHours <= 168) return 75 // 7 Days
  if (diffHours <= 336) return 40 // 14 Days
  return 10
}

export function calculateRecencyScore(
  arg1: OpportunityChangeEvent[] | string,
  arg2?: string | OpportunityChangeEvent[],
  nowMs: number = Date.now()
): number {
  let events: OpportunityChangeEvent[] = []
  let oppId = ""

  if (Array.isArray(arg1)) {
    events = arg1
    oppId = typeof arg2 === "string" ? arg2 : ""
  } else if (typeof arg1 === "string") {
    oppId = arg1
    events = Array.isArray(arg2) ? arg2 : []
  }

  if (!oppId || events.length === 0) return 0
  const oppEvents = events.filter((e) => e.opportunity_id === oppId)
  if (oppEvents.length === 0) return 0

  const latestEvent = oppEvents.sort((a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime())[0]
  if (!latestEvent) return 0

  const eventMs = new Date(latestEvent.detected_at).getTime()
  if (isNaN(eventMs) || nowMs - eventMs > RADAR_RECENCY_WINDOW_MS) return 0

  return 100
}

export function calculateActionabilityScore(
  status: string,
  hasSaved: boolean,
  hasApplied: boolean,
  incompleteTaskCount: number
): number {
  if (status === "expired" || status === "archived") return 0
  if (incompleteTaskCount > 0) return 100
  if (hasSaved && !hasApplied) return 90
  if (!hasSaved && !hasApplied) return 80
  if (hasApplied) return 60
  return 50
}

export function calculateSourceScore(sourcePlatformOrOpp: string | Opportunity): number {
  if (typeof sourcePlatformOrOpp === "object" && sourcePlatformOrOpp !== null) {
    if (sourcePlatformOrOpp.verification_state === "deprecated") return 0
    if (sourcePlatformOrOpp.verification_state === "pending") return 60
    return calculateSourceScore(sourcePlatformOrOpp.source_platform)
  }
  const platform = typeof sourcePlatformOrOpp === "string" ? sourcePlatformOrOpp : ""
  const priority = getSourcePriority(platform)
  if (priority <= 1) return 100
  if (priority === 2) return 85
  return 70
}

export function calculateRadarPriority(
  matchScore: number,
  urgencyScore: number,
  actionabilityScore: number,
  recencyScore: number,
  sourceScore: number
): RadarPriorityScore {
  const priorityScore = Math.round(
    matchScore * 0.40 +
    urgencyScore * 0.25 +
    actionabilityScore * 0.15 +
    recencyScore * 0.10 +
    sourceScore * 0.10
  )

  return {
    priorityScore,
    matchScore,
    urgencyScore,
    recencyScore,
    actionabilityScore,
    sourceScore,
  }
}

export function evaluateRadarReasonChips(
  opp: Opportunity,
  match: number | { match_score: number },
  urgencyScore: number,
  hasRecentChange: boolean,
  hasSaved: boolean,
  hasApplied: boolean,
  incompleteTaskCount: number
): RadarReasonChip[] {
  const chips: RadarReasonChip[] = []
  const matchScore = typeof match === "number" ? match : match.match_score

  // Match chip
  chips.push({ label: `${matchScore}% match`, variant: matchScore >= 80 ? "primary" : "muted" })

  // Urgency chip
  if (opp.deadline && opp.status === "active") {
    const deadlineMs = new Date(opp.deadline).getTime()
    const diffHours = (deadlineMs - Date.now()) / (1000 * 60 * 60)
    if (diffHours > 0 && diffHours <= 48) {
      chips.push({ label: `Deadline in ${Math.round(diffHours)}h`, variant: "warning" })
    } else if (diffHours > 48 && diffHours <= 168) {
      const days = Math.ceil(diffHours / 24)
      chips.push({ label: `Deadline in ${days} days`, variant: "warning" })
    }
  }

  // Lifecycle chip
  if (incompleteTaskCount > 0) {
    chips.push({ label: `${incompleteTaskCount} prep tasks incomplete`, variant: "primary" })
  } else if (hasApplied) {
    chips.push({ label: "Applied", variant: "success" })
  } else if (hasSaved) {
    chips.push({ label: "Saved", variant: "muted" })
  }

  // Recency chip
  if (hasRecentChange) {
    chips.push({ label: "Recent update", variant: "primary" })
  }

  return chips
}

export interface BuildRadarOptions {
  studentContext: StudentContextPayload
  opportunities: Opportunity[]
  savedOpportunityIds?: Set<string> | SavedOpportunity[]
  applications?: Map<string, ApplicationStatus> | OpportunityApplication[]
  matches?: Map<string, ComprehensiveMatchResult | { match_score: number }> | OpportunityMatch[]
  prepPlans?: Map<string, { opportunity_id: string } | object> | { opportunity_id: string }[]
  tasks?: { title: string; status: string }[]
  changeEvents?: OpportunityChangeEvent[]
  nowMs?: number
}

export function buildOpportunityRadar(
  arg1: StudentContextPayload | BuildRadarOptions,
  arg2?: Opportunity[],
  arg3?: OpportunityMatch[],
  arg4?: SavedOpportunity[],
  arg5?: OpportunityApplication[],
  arg6?: { opportunity_id: string }[],
  arg7?: { title: string; status: string }[],
  arg8?: OpportunityChangeEvent[],
  arg9: number = Date.now()
): RadarResult {
  let student: StudentContextPayload
  let catalog: Opportunity[]
  let savedOppIds = new Set<string>()
  let appMap = new Map<string, ApplicationStatus>()
  const matchMap = new Map<string, number>()
  const prepOppIds = new Set<string>()
  let tasks: { title: string; status: string }[] = []
  let changeEvents: OpportunityChangeEvent[] = []
  let nowMs = arg9

  if (arg1 && typeof arg1 === "object" && "opportunities" in arg1) {
    student = arg1.studentContext
    catalog = arg1.opportunities || []
    nowMs = arg1.nowMs ?? Date.now()
    if (arg1.changeEvents) changeEvents = arg1.changeEvents
    if (arg1.tasks) tasks = arg1.tasks

    if (arg1.savedOpportunityIds) {
      if (arg1.savedOpportunityIds instanceof Set) {
        savedOppIds = arg1.savedOpportunityIds
      } else if (Array.isArray(arg1.savedOpportunityIds)) {
        savedOppIds = new Set(arg1.savedOpportunityIds.map((s) => s.opportunity_id))
      }
    }

    if (arg1.applications) {
      if (arg1.applications instanceof Map) {
        appMap = arg1.applications
      } else if (Array.isArray(arg1.applications)) {
        appMap = new Map(arg1.applications.map((a) => [a.opportunity_id, a.status]))
      }
    }

    if (arg1.matches) {
      if (arg1.matches instanceof Map) {
        arg1.matches.forEach((val, key) => {
          matchMap.set(key, typeof val === "number" ? val : val.match_score)
        })
      } else if (Array.isArray(arg1.matches)) {
        arg1.matches.forEach((m) => matchMap.set(m.opportunity_id, m.match_score))
      }
    }

    if (arg1.prepPlans) {
      if (arg1.prepPlans instanceof Map) {
        arg1.prepPlans.forEach((_, key) => prepOppIds.add(key))
      } else if (Array.isArray(arg1.prepPlans)) {
        arg1.prepPlans.forEach((p) => prepOppIds.add(p.opportunity_id))
      }
    }
  } else {
    student = arg1 as StudentContextPayload
    catalog = arg2 || []
    if (arg3) arg3.forEach((m) => matchMap.set(m.opportunity_id, m.match_score))
    if (arg4) savedOppIds = new Set(arg4.map((s) => s.opportunity_id))
    if (arg5) appMap = new Map(arg5.map((a) => [a.opportunity_id, a.status]))
    if (arg6) arg6.forEach((p) => prepOppIds.add(p.opportunity_id))
    if (arg7) tasks = arg7
    if (arg8) changeEvents = arg8
  }

  const incompleteTaskCount = tasks.filter((t) => t.status !== "done" && t.status !== "completed").length
  const radarItems: RadarItem[] = []
  const seenIds = new Set<string>()

  for (const opp of catalog) {
    if (seenIds.has(opp.id)) continue
    seenIds.add(opp.id)

    // STEP 3: ELIGIBILITY FIRST (Exclude clearly ineligible opportunities)
    const eligibility = evaluateStudentEligibility(student, opp)
    if (!eligibility.isEligible) continue

    // STEP 4: REUSE EXISTING 50/30/20 MATCH SCORE
    const cachedMatchScore = matchMap.get(opp.id)
    const matchScore = cachedMatchScore !== undefined ? cachedMatchScore : calculateDeterministicMatch(student, opp).match_score

    const hasSaved = savedOppIds.has(opp.id)
    const appStatus = appMap.get(opp.id)
    const hasApplied = appStatus === "applied" || appStatus === "applying" || appStatus === "interviewing" || appStatus === "accepted"

    const isClosed = opp.status === "expired" || opp.status === "archived"

    const urgencyScore = calculateDeadlineUrgencyScore(opp.deadline, nowMs)
    const recencyScore = calculateRecencyScore(changeEvents, opp.id, nowMs)
    const oppIncompleteTasks = (prepOppIds.has(opp.id) || hasSaved || hasApplied) ? incompleteTaskCount : 0
    const actionabilityScore = calculateActionabilityScore(opp.status, hasSaved, hasApplied, oppIncompleteTasks)
    const sourceScore = calculateSourceScore(opp)

    const priority = calculateRadarPriority(matchScore, urgencyScore, actionabilityScore, recencyScore, sourceScore)
    const hasRecentChange = recencyScore > 0

    let lifecycleState: RadarItem["lifecycleState"] = "not_saved"
    if (isClosed) {
      lifecycleState = "closed"
    } else if (oppIncompleteTasks > 0 && (hasSaved || hasApplied)) {
      lifecycleState = "prep_incomplete"
    } else if (hasApplied) {
      lifecycleState = "applied"
    } else if (hasSaved) {
      lifecycleState = "saved"
    }

    let actionType: RadarItem["primaryAction"]["action_type"] = "view_opportunity"
    let actionLabel = "View opportunity"

    if (lifecycleState === "prep_incomplete") {
      actionType = "continue_prep"
      actionLabel = "Continue prep"
    } else if (lifecycleState === "applied") {
      actionType = "track_application"
      actionLabel = "Track application"
    } else if (lifecycleState === "saved") {
      actionType = "prepare_application"
      actionLabel = "Prepare application"
    }

    const reasonChips = evaluateRadarReasonChips(
      opp,
      matchScore,
      urgencyScore,
      hasRecentChange,
      hasSaved,
      hasApplied,
      oppIncompleteTasks
    )

    radarItems.push({
      opportunity: opp,
      match: null,
      priority,
      reasonChips,
      primaryAction: {
        label: actionLabel,
        action_type: actionType,
        href: `/app/opportunities?id=${opp.id}`,
      },
      lifecycleState,
    })
  }

  // Sort by priorityScore desc
  radarItems.sort((a, b) => b.priority.priorityScore - a.priority.priorityScore)

  // Primary recommendation: top active item
  const primaryRecommendation = radarItems.find((item) => item.lifecycleState !== "closed") ?? null

  // Categorized sections
  const applyNow = radarItems.filter(
    (item) => item.lifecycleState !== "closed" && item.lifecycleState !== "applied" && (item.priority.urgencyScore >= 75 || item.priority.matchScore >= 80)
  )

  const bestMatches = radarItems.filter((item) => item.lifecycleState !== "closed" && item.priority.matchScore >= 70)

  const deadlineSoon = radarItems.filter(
    (item) => item.lifecycleState !== "closed" && item.opportunity.deadline && item.priority.urgencyScore >= 75
  )

  const newlyOpened = radarItems.filter((item) => item.lifecycleState !== "closed" && item.priority.recencyScore > 0)

  const ambassadors = radarItems.filter((item) => item.lifecycleState !== "closed" && item.opportunity.type === "ambassador")

  const prepareNext = radarItems.filter((item) => item.lifecycleState === "prep_incomplete" || (item.lifecycleState === "saved" && prepOppIds.has(item.opportunity.id)))

  const watchlist = radarItems.filter((item) => item.lifecycleState === "saved" && !prepOppIds.has(item.opportunity.id))

  return {
    primaryRecommendation,
    applyNow,
    bestMatches,
    deadlineSoon,
    newlyOpened,
    ambassadors,
    prepareNext,
    watchlist,
    totalEvaluated: catalog.length,
    generatedAt: new Date(nowMs).toISOString(),
  }
}
