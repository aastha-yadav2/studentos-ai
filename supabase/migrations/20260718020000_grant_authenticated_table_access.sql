-- RLS policies do not grant PostgreSQL privileges. Grant the authenticated role
-- table access, then let the existing auth.uid() RLS policies scope every row.
grant usage on schema public to authenticated;

grant select, insert, update, delete on table
  public.student_profiles,
  public.user_preferences,
  public.goals,
  public.goal_milestones,
  public.student_tasks,
  public.deadlines,
  public.planner_runs,
  public.ai_recommendations,
  public.activity_events,
  public.subjects,
  public.study_plans,
  public.career_profiles,
  public.career_roadmaps,
  public.user_memory_profiles,
  public.ai_memory_entries,
  public.planner_interactions,
  public.learned_preferences,
  public.weekly_reflections,
  public.monthly_performance_reports,
  public.habit_insights,
  public.adaptive_recommendations,
  public.coaching_messages,
  public.predictions,
  public.reflection_timeline_events
to authenticated;

-- Keep anonymous requests unable to access workspace tables. No RLS policy is
-- modified by this migration.
revoke all on all tables in schema public from anon;
