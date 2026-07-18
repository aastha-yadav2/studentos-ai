# Database reference

All application tables use `user_id → auth.users(id)` where appropriate, have Row Level Security enabled, and use policies limited to `auth.uid() = user_id`. This is the primary tenant-isolation boundary.

| Domain | Tables |
| --- | --- |
| Profile & preferences | `student_profiles`, `user_preferences` |
| Workspace | `goals`, `student_tasks`, `deadlines`, `planner_runs`, `ai_recommendations`, `activity_events` |
| Study & career | `subjects`, `study_plans`, `career_profiles`, `career_roadmaps` |
| Goals | `goal_milestones` |
| Memory | `ai_memory_entries`, `planner_interactions` |
| Reflection | `weekly_reflections`, `monthly_performance_reports`, `habit_insights`, `adaptive_recommendations`, `coaching_messages`, `predictions`, `reflection_timeline_events` |

## Relationships and data flow

`auth.users` owns every workspace record. Goals can have milestones; planner runs create activity and recommendation records; completed tasks and goal progress feed reflections; reflections create habits, coach messages, predictions, recommendations, and timeline events.

## Indexes

The migrations index task/deadline due dates, planner history timestamps, reflection periods, recommendation status, prediction type, timeline dates, task completion state, active goal targets, habit keys, and coaching time. These serve dashboard, calendar, adaptive planning, and report queries.

## Storage

No Supabase Storage bucket is required by the present implementation. Add an RLS-protected bucket and signed URLs before introducing resumes, certificates, or avatars.

## Migration order

Apply every file in `supabase/migrations` in lexical order. Never edit an already-applied migration in production; add a new forward-only migration instead.
