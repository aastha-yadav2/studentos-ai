export type NotificationType =
  | "new_high_match_opportunity"
  | "registration_opened"
  | "registration_closed"
  | "deadline_changed"
  | "deadline_approaching"
  | "eligibility_changed"
  | "skills_changed"
  | "new_ambassador_opportunity"
  | "opportunity_reactivated"
  | "prep_tasks_incomplete"
  | "weekly_opportunity_digest"

export type NotificationSeverity = "high" | "medium" | "low"

export interface UserNotification {
  id: string
  user_id: string
  opportunity_id?: string | null
  notification_type: NotificationType
  title: string
  message: string
  severity: NotificationSeverity
  action_url?: string | null
  metadata?: Record<string, unknown> | null
  dedupe_key: string
  read_at?: string | null
  dismissed_at?: string | null
  created_at: string
}

export interface NotificationPreferences {
  user_id?: string
  enabled: boolean
  task_reminders: boolean
  deadline_alerts: boolean
  weekly_summary: boolean
  product_updates: boolean
  new_opportunities: boolean
  opportunity_changes: boolean
  ambassador_alerts: boolean
  prep_reminders: boolean
  minimum_match_score: number
}

export interface NotificationGenerationResult {
  totalEvaluated: number
  totalCreated: number
  notifications: UserNotification[]
}
