import { supabase } from "@/lib/supabase"
import type { Opportunity } from "../opportunities/opportunityTypes"
import type { StudentContextPayload } from "../opportunities/opportunityAIService"
import type { OpportunityChangeEvent } from "../opportunities/freshness/types"
import type { NotificationPreferences, UserNotification } from "./types"
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  evaluateAmbassadorNotification,
  evaluateChangeEventNotification,
  evaluateDeadlineApproachingNotification,
  evaluateHighMatchNotification,
  evaluateWeeklyDigestNotification,
} from "./notificationRules"

export async function fetchUserNotifications(userId: string): Promise<UserNotification[]> {
  if (!supabase || !userId) return []
  try {
    const { data, error } = await supabase
      .from("user_notifications")
      .select("*")
      .eq("user_id", userId)
      .is("dismissed_at", null)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching user notifications:", error)
      return []
    }
    return data as UserNotification[]
  } catch (err) {
    console.error("Exception fetching notifications:", err)
    return []
  }
}

export async function markNotificationAsRead(userId: string, notificationId: string): Promise<boolean> {
  if (!supabase || !userId || !notificationId) return false
  try {
    const { error } = await supabase
      .from("user_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("id", notificationId)

    if (error) {
      console.error("Error marking notification as read:", error)
      return false
    }
    return true
  } catch (err) {
    console.error("Exception marking notification as read:", err)
    return false
  }
}

export async function markAllNotificationsAsRead(userId: string): Promise<boolean> {
  if (!supabase || !userId) return false
  try {
    const { error } = await supabase
      .from("user_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null)

    if (error) {
      console.error("Error marking all notifications as read:", error)
      return false
    }
    return true
  } catch (err) {
    console.error("Exception marking all notifications as read:", err)
    return false
  }
}

export async function dismissNotification(userId: string, notificationId: string): Promise<boolean> {
  if (!supabase || !userId || !notificationId) return false
  try {
    const { error } = await supabase
      .from("user_notifications")
      .update({ dismissed_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("id", notificationId)

    if (error) {
      console.error("Error dismissing notification:", error)
      return false
    }
    return true
  } catch (err) {
    console.error("Exception dismissing notification:", err)
    return false
  }
}

export async function fetchNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  if (!supabase || !userId) return DEFAULT_NOTIFICATION_PREFERENCES
  try {
    const { data, error } = await supabase
      .from("user_preferences")
      .select("task_reminders,deadline_alerts,weekly_summary,product_updates,new_opportunities,opportunity_changes,ambassador_alerts,prep_reminders,minimum_match_score")
      .eq("user_id", userId)
      .maybeSingle()

    if (error || !data) {
      return DEFAULT_NOTIFICATION_PREFERENCES
    }

    return {
      user_id: userId,
      enabled: true,
      task_reminders: data.task_reminders ?? true,
      deadline_alerts: data.deadline_alerts ?? true,
      weekly_summary: data.weekly_summary ?? true,
      product_updates: data.product_updates ?? false,
      new_opportunities: data.new_opportunities ?? true,
      opportunity_changes: data.opportunity_changes ?? true,
      ambassador_alerts: data.ambassador_alerts ?? true,
      prep_reminders: data.prep_reminders ?? true,
      minimum_match_score: data.minimum_match_score ?? 80,
    }
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES
  }
}

export async function saveNotificationPreferences(
  userId: string,
  prefs: Partial<NotificationPreferences>
): Promise<boolean> {
  if (!supabase || !userId) return false
  try {
    const payload = {
      user_id: userId,
      task_reminders: prefs.task_reminders ?? true,
      deadline_alerts: prefs.deadline_alerts ?? true,
      weekly_summary: prefs.weekly_summary ?? true,
      product_updates: prefs.product_updates ?? false,
      new_opportunities: prefs.new_opportunities ?? true,
      opportunity_changes: prefs.opportunity_changes ?? true,
      ambassador_alerts: prefs.ambassador_alerts ?? true,
      prep_reminders: prefs.prep_reminders ?? true,
      minimum_match_score: prefs.minimum_match_score ?? 80,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase.from("user_preferences").upsert(payload, { onConflict: "user_id" })
    if (error) {
      console.error("Error saving notification preferences:", error)
      return false
    }
    return true
  } catch (err) {
    console.error("Exception saving notification preferences:", err)
    return false
  }
}

// ── DOWNSTREAM FAILURE-SAFE NOTIFICATION WRITER ─────────────────────────────
export async function saveNotifications(notifications: UserNotification[]): Promise<boolean> {
  if (!supabase || notifications.length === 0) return true
  try {
    const rows = notifications.map((n) => ({
      user_id: n.user_id,
      opportunity_id: n.opportunity_id ?? null,
      notification_type: n.notification_type,
      title: n.title,
      message: n.message,
      severity: n.severity,
      action_url: n.action_url ?? null,
      metadata: n.metadata ?? {},
      dedupe_key: n.dedupe_key,
      created_at: n.created_at,
    }))

    const { error } = await supabase.from("user_notifications").upsert(rows, { onConflict: "user_id,dedupe_key", ignoreDuplicates: true })
    if (error) {
      console.error("Error saving notifications (failure-safe):", error)
      return false
    }
    return true
  } catch (err) {
    console.error("Failure-safe exception saving notifications:", err)
    return false
  }
}

// ── HIGH-LEVEL NOTIFICATION GENERATION PIPELINES ────────────────────────────

export async function processOpportunityEventsForStudentNotifications(
  userId: string,
  student: StudentContextPayload,
  opp: Opportunity,
  events: OpportunityChangeEvent[],
  prefs: NotificationPreferences = DEFAULT_NOTIFICATION_PREFERENCES
): Promise<UserNotification[]> {
  const generated: UserNotification[] = []

  // Check for high-match or ambassador opportunity alert
  const highMatch = evaluateHighMatchNotification(userId, student, opp, prefs)
  if (highMatch) generated.push(highMatch)

  const ambassadorAlert = evaluateAmbassadorNotification(userId, student, opp, prefs)
  if (ambassadorAlert) generated.push(ambassadorAlert)

  // Evaluate Phase 8 change events
  for (const event of events) {
    const changeNotif = evaluateChangeEventNotification(userId, student, opp, event, prefs)
    if (changeNotif) generated.push(changeNotif)
  }

  if (generated.length > 0) {
    await saveNotifications(generated)
  }
  return generated
}

export async function generateDeadlineApproachingNotifications(
  userId: string,
  student: StudentContextPayload,
  catalog: Opportunity[],
  prefs: NotificationPreferences = DEFAULT_NOTIFICATION_PREFERENCES,
  nowMs: number = Date.now()
): Promise<UserNotification[]> {
  const generated: UserNotification[] = []
  for (const opp of catalog) {
    const notif = evaluateDeadlineApproachingNotification(userId, student, opp, prefs, nowMs)
    if (notif) generated.push(notif)
  }

  if (generated.length > 0) {
    await saveNotifications(generated)
  }
  return generated
}

export async function generateWeeklyOpportunityDigest(
  userId: string,
  student: StudentContextPayload,
  catalog: Opportunity[],
  yearWeekTag: string,
  prefs: NotificationPreferences = DEFAULT_NOTIFICATION_PREFERENCES
): Promise<UserNotification | null> {
  const notif = evaluateWeeklyDigestNotification(userId, catalog, yearWeekTag, prefs)
  if (notif) {
    await saveNotifications([notif])
  }
  return notif
}
