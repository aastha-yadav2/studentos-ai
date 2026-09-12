import type { Opportunity } from "../opportunities/opportunityTypes"
import type { StudentContextPayload } from "../opportunities/opportunityAIService"
import { calculateDeterministicMatch } from "../opportunities/deterministicMatcher"
import { evaluateStudentEligibility } from "../opportunities/ingestion/eligibilityExtractor"
import type { OpportunityChangeEvent } from "../opportunities/freshness/types"
import type { NotificationPreferences, UserNotification } from "./types"
import {
  makeAmbassadorDedupeKey,
  makeDeadlineApproachingDedupeKey,
  makeDeadlineChangedDedupeKey,
  makeEligibilityChangedDedupeKey,
  makeNewHighMatchDedupeKey,
  makePrepReminderDedupeKey,
  makeReactivatedDedupeKey,
  makeRegistrationOpenedDedupeKey,
  makeSkillsChangedDedupeKey,
  makeWeeklyDigestDedupeKey,
} from "./notificationDeduplicator"

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  task_reminders: true,
  deadline_alerts: true,
  weekly_summary: true,
  product_updates: false,
  new_opportunities: true,
  opportunity_changes: true,
  ambassador_alerts: true,
  prep_reminders: true,
  minimum_match_score: 80,
}

// 1. High Match Opportunity Rule
export function evaluateHighMatchNotification(
  userId: string,
  student: StudentContextPayload,
  opp: Opportunity,
  prefs: NotificationPreferences = DEFAULT_NOTIFICATION_PREFERENCES
): UserNotification | null {
  if (!prefs.enabled || !prefs.new_opportunities) return null

  const eligibility = evaluateStudentEligibility(student, opp)
  if (!eligibility.isEligible) return null

  const match = calculateDeterministicMatch(student, opp)
  if (match.match_score < prefs.minimum_match_score) return null

  const dedupeKey = makeNewHighMatchDedupeKey(userId, opp.id)
  const severity = match.match_score >= 90 ? "high" : "medium"

  return {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    user_id: userId,
    opportunity_id: opp.id,
    notification_type: "new_high_match_opportunity",
    title: `New ${match.match_score}% match: ${opp.title}`,
    message: `${opp.organization} posted a ${opp.type} matching your ${match.skill_match_score}% skill profile.`,
    severity,
    action_url: `/app/opportunities?id=${opp.id}`,
    metadata: {
      match_score: match.match_score,
      organization: opp.organization,
      type: opp.type,
    },
    dedupe_key: dedupeKey,
    created_at: new Date().toISOString(),
  }
}

// 2. Change Event Notification Rule
export function evaluateChangeEventNotification(
  userId: string,
  student: StudentContextPayload,
  opp: Opportunity,
  event: OpportunityChangeEvent,
  prefs: NotificationPreferences = DEFAULT_NOTIFICATION_PREFERENCES
): UserNotification | null {
  if (!prefs.enabled || !prefs.opportunity_changes) return null

  const eligibility = evaluateStudentEligibility(student, opp)
  const match = calculateDeterministicMatch(student, opp)

  // Must be generally relevant to student (score >= 40 or active participant)
  if (match.match_score < 40 && !eligibility.isEligible) return null

  const now = new Date().toISOString()

  switch (event.change_type) {
    case "registration_opened": {
      if (!eligibility.isEligible) return null
      return {
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        user_id: userId,
        opportunity_id: opp.id,
        notification_type: "registration_opened",
        title: `Applications Open: ${opp.title}`,
        message: `Registration for ${opp.organization}'s ${opp.type} is now open!`,
        severity: "medium",
        action_url: `/app/opportunities?id=${opp.id}`,
        metadata: { source_url: opp.source_url },
        dedupe_key: makeRegistrationOpenedDedupeKey(userId, opp.id),
        created_at: now,
      }
    }

    case "deadline_changed": {
      if (!prefs.deadline_alerts || !eligibility.isEligible) return null
      return {
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        user_id: userId,
        opportunity_id: opp.id,
        notification_type: "deadline_changed",
        title: `Deadline updated: ${opp.title}`,
        message: `The application deadline for ${opp.title} changed to ${opp.deadline ?? "unspecified"}.`,
        severity: "medium",
        action_url: `/app/opportunities?id=${opp.id}`,
        metadata: { old_value: event.old_value, new_value: event.new_value },
        dedupe_key: makeDeadlineChangedDedupeKey(userId, opp.id, event.id),
        created_at: now,
      }
    }

    case "eligibility_changed": {
      if (!eligibility.isEligible) return null
      return {
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        user_id: userId,
        opportunity_id: opp.id,
        notification_type: "eligibility_changed",
        title: `Eligibility updated: ${opp.title}`,
        message: `Eligibility requirements for ${opp.title} updated. You now qualify to apply!`,
        severity: "high",
        action_url: `/app/opportunities?id=${opp.id}`,
        metadata: { matchedRules: eligibility.matchedRules },
        dedupe_key: makeEligibilityChangedDedupeKey(userId, opp.id, event.id),
        created_at: now,
      }
    }

    case "skills_changed":
    case "required_skills_changed": {
      if (match.skill_match_score === 0) return null
      return {
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        user_id: userId,
        opportunity_id: opp.id,
        notification_type: "skills_changed",
        title: `Skills updated: ${opp.title}`,
        message: `Required skills for ${opp.title} were updated (${opp.required_skills.slice(0, 3).join(", ")}).`,
        severity: "low",
        action_url: `/app/opportunities?id=${opp.id}`,
        metadata: { required_skills: opp.required_skills },
        dedupe_key: makeSkillsChangedDedupeKey(userId, opp.id, event.id),
        created_at: now,
      }
    }

    case "opportunity_reactivated": {
      if (!eligibility.isEligible) return null
      return {
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        user_id: userId,
        opportunity_id: opp.id,
        notification_type: "opportunity_reactivated",
        title: `Opportunity reactivated: ${opp.title}`,
        message: `${opp.title} by ${opp.organization} is active and accepting applications again.`,
        severity: "medium",
        action_url: `/app/opportunities?id=${opp.id}`,
        metadata: { status: opp.status },
        dedupe_key: makeReactivatedDedupeKey(userId, opp.id, event.id),
        created_at: now,
      }
    }

    default:
      return null
  }
}

// 3. Deadline Approaching Proximity Rule (7d / 48h)
export function evaluateDeadlineApproachingNotification(
  userId: string,
  student: StudentContextPayload,
  opp: Opportunity,
  prefs: NotificationPreferences = DEFAULT_NOTIFICATION_PREFERENCES,
  nowMs: number = Date.now()
): UserNotification | null {
  if (!prefs.enabled || !prefs.deadline_alerts || !opp.deadline || opp.status !== "active") return null

  const eligibility = evaluateStudentEligibility(student, opp)
  if (!eligibility.isEligible) return null

  const deadlineMs = new Date(opp.deadline).getTime()
  if (isNaN(deadlineMs) || deadlineMs <= nowMs) return null

  const diffHours = (deadlineMs - nowMs) / (1000 * 60 * 60)

  let windowTag: "7d" | "48h" | null = null
  let severity: "high" | "medium" = "medium"

  if (diffHours <= 48 && diffHours > 0) {
    windowTag = "48h"
    severity = "high"
  } else if (diffHours <= 168 && diffHours > 48) {
    windowTag = "7d"
    severity = "medium"
  }

  if (!windowTag) return null

  const hoursLeft = Math.round(diffHours)
  const dedupeKey = makeDeadlineApproachingDedupeKey(userId, opp.id, opp.deadline, windowTag)

  return {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    user_id: userId,
    opportunity_id: opp.id,
    notification_type: "deadline_approaching",
    title: windowTag === "48h" ? `Urgent: ${opp.title} deadline in ${hoursLeft}h` : `Upcoming deadline: ${opp.title}`,
    message: `The application deadline for ${opp.title} (${opp.organization}) is approaching in ${hoursLeft} hours.`,
    severity,
    action_url: `/app/opportunities?id=${opp.id}`,
    metadata: { deadline: opp.deadline, hoursLeft, windowTag },
    dedupe_key: dedupeKey,
    created_at: new Date(nowMs).toISOString(),
  }
}

// 4. Ambassador Opportunity Discovery Rule
export function evaluateAmbassadorNotification(
  userId: string,
  student: StudentContextPayload,
  opp: Opportunity,
  prefs: NotificationPreferences = DEFAULT_NOTIFICATION_PREFERENCES
): UserNotification | null {
  if (!prefs.enabled || !prefs.ambassador_alerts || opp.type !== "ambassador") return null

  const eligibility = evaluateStudentEligibility(student, opp)
  if (!eligibility.isEligible) return null

  const match = calculateDeterministicMatch(student, opp)
  if (match.match_score < 60) return null

  const dedupeKey = makeAmbassadorDedupeKey(userId, opp.id)

  return {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    user_id: userId,
    opportunity_id: opp.id,
    notification_type: "new_ambassador_opportunity",
    title: `Campus Ambassador program: ${opp.title}`,
    message: `${opp.organization} is recruiting campus leaders. Your background aligns with this leadership role.`,
    severity: "medium",
    action_url: `/app/opportunities?id=${opp.id}`,
    metadata: { category: opp.category, organization: opp.organization },
    dedupe_key: dedupeKey,
    created_at: new Date().toISOString(),
  }
}

// 5. Incomplete Prep Tasks Reminder Rule
export function evaluatePrepTaskReminderNotification(
  userId: string,
  opp: Opportunity,
  incompleteTaskCount: number,
  prefs: NotificationPreferences = DEFAULT_NOTIFICATION_PREFERENCES
): UserNotification | null {
  if (!prefs.enabled || !prefs.prep_reminders || incompleteTaskCount <= 0) return null

  const nowIso = new Date().toISOString()
  const dedupeKey = makePrepReminderDedupeKey(userId, opp.id, nowIso)

  return {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    user_id: userId,
    opportunity_id: opp.id,
    notification_type: "prep_tasks_incomplete",
    title: `Incomplete prep tasks for ${opp.title}`,
    message: `You have ${incompleteTaskCount} incomplete preparation task(s) for ${opp.title}. Keep building your readiness!`,
    severity: "medium",
    action_url: `/app/tasks`,
    metadata: { incompleteTaskCount },
    dedupe_key: dedupeKey,
    created_at: nowIso,
  }
}

// 6. Weekly Opportunity Digest Rule
export function evaluateWeeklyDigestNotification(
  userId: string,
  topOpportunities: Opportunity[],
  yearWeekTag: string,
  prefs: NotificationPreferences = DEFAULT_NOTIFICATION_PREFERENCES
): UserNotification | null {
  if (!prefs.enabled || !prefs.weekly_summary || topOpportunities.length === 0) return null

  const dedupeKey = makeWeeklyDigestDedupeKey(userId, yearWeekTag)
  const topTitles = topOpportunities.slice(0, 3).map((o) => o.title).join(", ")

  return {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    user_id: userId,
    opportunity_id: topOpportunities[0]?.id ?? null,
    notification_type: "weekly_opportunity_digest",
    title: `Weekly Opportunity Digest (${yearWeekTag})`,
    message: `Top opportunity picks for your student profile this week: ${topTitles}.`,
    severity: "low",
    action_url: `/app/opportunities`,
    metadata: { topCount: topOpportunities.length, yearWeekTag },
    dedupe_key: dedupeKey,
    created_at: new Date().toISOString(),
  }
}
