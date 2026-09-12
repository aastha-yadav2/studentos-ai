import type { NotificationType } from "./types"

export function buildDedupeKey(
  userId: string,
  opportunityId: string | null | undefined,
  type: NotificationType,
  detailKey?: string
): string {
  const cleanUser = userId.trim()
  const cleanOpp = opportunityId ? opportunityId.trim() : "global"
  const cleanDetail = detailKey ? detailKey.trim() : ""

  if (cleanDetail) {
    return `${cleanUser}:${cleanOpp}:${type}:${cleanDetail}`
  }
  return `${cleanUser}:${cleanOpp}:${type}`
}

export function makeNewHighMatchDedupeKey(userId: string, opportunityId: string): string {
  return buildDedupeKey(userId, opportunityId, "new_high_match_opportunity")
}

export function makeRegistrationOpenedDedupeKey(userId: string, opportunityId: string): string {
  return buildDedupeKey(userId, opportunityId, "registration_opened")
}

export function makeRegistrationClosedDedupeKey(userId: string, opportunityId: string): string {
  return buildDedupeKey(userId, opportunityId, "registration_closed")
}

export function makeDeadlineChangedDedupeKey(userId: string, opportunityId: string, eventId: string): string {
  return buildDedupeKey(userId, opportunityId, "deadline_changed", eventId)
}

export function makeDeadlineApproachingDedupeKey(
  userId: string,
  opportunityId: string,
  deadlineIso: string,
  windowTag: "7d" | "48h"
): string {
  const dateTag = deadlineIso.split("T")[0] ?? deadlineIso
  return buildDedupeKey(userId, opportunityId, "deadline_approaching", `${dateTag}_${windowTag}`)
}

export function makeEligibilityChangedDedupeKey(userId: string, opportunityId: string, eventId: string): string {
  return buildDedupeKey(userId, opportunityId, "eligibility_changed", eventId)
}

export function makeSkillsChangedDedupeKey(userId: string, opportunityId: string, eventId: string): string {
  return buildDedupeKey(userId, opportunityId, "skills_changed", eventId)
}

export function makeAmbassadorDedupeKey(userId: string, opportunityId: string): string {
  return buildDedupeKey(userId, opportunityId, "new_ambassador_opportunity")
}

export function makeReactivatedDedupeKey(userId: string, opportunityId: string, eventId: string): string {
  return buildDedupeKey(userId, opportunityId, "opportunity_reactivated", eventId)
}

export function makePrepReminderDedupeKey(userId: string, opportunityId: string, dateIso: string): string {
  const dateTag = dateIso.split("T")[0] ?? dateIso
  return buildDedupeKey(userId, opportunityId, "prep_tasks_incomplete", dateTag)
}

export function makeWeeklyDigestDedupeKey(userId: string, yearWeekTag: string): string {
  return buildDedupeKey(userId, null, "weekly_opportunity_digest", yearWeekTag)
}
