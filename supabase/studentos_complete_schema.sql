-- StudentOS AI complete Supabase schema
-- Run this file in the Supabase SQL Editor on a new project.
-- It creates every table currently referenced by src/ and the Edge Function clients.
-- Storage is intentionally omitted: the application does not currently upload files.

create extension if not exists pgcrypto;

-- ── Profile, preferences, and workspace ────────────────────────────────────
create table if not exists public.student_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '', semester text not null,
  career_goals text[] not null default '{}', skills text[] not null default '{}',
  preferred_study_hours text not null, internship_interests text[] not null default '{}',
  hackathon_interests text[] not null default '{}', learning_goals text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'dark' check (theme in ('light','dark','system')),
  task_reminders boolean not null default true, deadline_alerts boolean not null default true,
  weekly_summary boolean not null default true, product_updates boolean not null default false,
  updated_at timestamptz not null default now()
);
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, category text not null default 'Academic', target_date date,
  progress integer not null default 0 check (progress between 0 and 100),
  status text not null default 'active' check (status in ('active','completed','paused','archived')),
  archived_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.goal_milestones (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade, title text not null,
  target_date date, is_completed boolean not null default false, completed_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.student_tasks (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, due_at timestamptz, priority text not null default 'Medium' check (priority in ('High','Medium','Low')),
  estimated_hours numeric(5,2) check (estimated_hours is null or estimated_hours >= 0),
  status text not null default 'todo' check (status in ('todo','in_progress','completed')),
  created_at timestamptz not null default now(), completed_at timestamptz
);
create table if not exists public.deadlines (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, due_at timestamptz not null, category text not null default 'Academic', created_at timestamptz not null default now()
);
create table if not exists public.planner_runs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, goal text not null, goal_type text not null, plan jsonb not null,
  created_at timestamptz not null default now()
);
create table if not exists public.ai_recommendations (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  content text not null, source text not null default 'Planner', is_dismissed boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null, description text not null, created_at timestamptz not null default now()
);

-- ── Study and career ────────────────────────────────────────────────────────
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, exam_date date not null, confidence integer not null default 3 check (confidence between 1 and 5),
  created_at timestamptz not null default now()
);
create table if not exists public.study_plans (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, plan jsonb not null, created_at timestamptz not null default now()
);
create table if not exists public.career_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade, placement_goal text not null,
  target_date date, internships text[] not null default '{}', companies text[] not null default '{}',
  skills text[] not null default '{}', updated_at timestamptz not null default now()
);
create table if not exists public.career_roadmaps (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, roadmap jsonb not null, created_at timestamptz not null default now()
);

-- ── AI memory ───────────────────────────────────────────────────────────────
create table if not exists public.user_memory_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade, semester text, degree text, university text,
  skills text[] not null default '{}', interests text[] not null default '{}', preferred_learning_style text,
  preferred_study_hours text, placement_goals text[] not null default '{}', internship_goals text[] not null default '{}',
  hackathon_interests text[] not null default '{}', career_aspirations text, updated_at timestamptz not null default now()
);
create table if not exists public.ai_memory_entries (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  memory_type text not null check (memory_type in ('profile','goal','planner','conversation','preference','insight')),
  status text not null default 'active' check (status in ('active','archived')), summary text not null,
  content jsonb not null default '{}'::jsonb, source text not null default 'system',
  importance smallint not null default 3 check (importance between 1 and 5), last_referenced_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.planner_interactions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  planner_run_id uuid references public.planner_runs(id) on delete set null,
  interaction_type text not null check (interaction_type in ('request','plan_summary','outcome','feedback')),
  summary text not null, content jsonb not null default '{}'::jsonb, meaningful boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.learned_preferences (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  preference_key text not null, preference_value jsonb not null,
  confidence numeric(3,2) not null default .5 check (confidence between 0 and 1),
  evidence_count integer not null default 1 check (evidence_count > 0), source text not null default 'observed',
  updated_at timestamptz not null default now(), unique (user_id, preference_key)
);

-- ── Reflection and adaptive learning ────────────────────────────────────────
create table if not exists public.weekly_reflections (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null, period_end date not null check (period_end >= period_start),
  metrics jsonb not null default '{}'::jsonb, insights jsonb not null default '[]'::jsonb,
  generated_at timestamptz not null default now(), unique (user_id, period_start)
);
create table if not exists public.monthly_performance_reports (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null, period_end date not null check (period_end >= period_start),
  report jsonb not null default '{}'::jsonb, generated_at timestamptz not null default now(), unique (user_id, period_start)
);
create table if not exists public.habit_insights (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  insight_key text not null, insight_value jsonb not null, confidence numeric(3,2) not null default .5 check (confidence between 0 and 1),
  evidence_count integer not null default 1 check (evidence_count > 0), updated_at timestamptz not null default now(), unique(user_id, insight_key)
);
create table if not exists public.adaptive_recommendations (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  recommendation_type text not null check (recommendation_type in ('schedule','workload','next_task','goal','skill','habit','project')),
  title text not null, rationale text not null, payload jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active','dismissed','completed')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.coaching_messages (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  message_type text not null check (message_type in ('motivation','productivity','burnout','encouragement','focus','time_management')),
  message text not null, rationale text not null, created_at timestamptz not null default now()
);
create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  prediction_type text not null check (prediction_type in ('goal_completion','deadline_risk','project_completion','placement_readiness','internship_readiness','semester_forecast')),
  score numeric(5,2) not null check (score between 0 and 100), label text not null, explanation text not null,
  payload jsonb not null default '{}'::jsonb, generated_at timestamptz not null default now()
);
create table if not exists public.reflection_timeline_events (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('weekly_reflection','monthly_report','insight','milestone','achievement')),
  title text not null, description text, reference_id uuid, occurred_at timestamptz not null default now()
);

-- ── Query indexes ───────────────────────────────────────────────────────────
create index if not exists student_tasks_user_due_idx on public.student_tasks(user_id, due_at);
create index if not exists student_tasks_user_status_completed_idx on public.student_tasks(user_id, status, completed_at desc);
create index if not exists deadlines_user_due_idx on public.deadlines(user_id, due_at);
create index if not exists planner_runs_user_created_idx on public.planner_runs(user_id, created_at desc);
create index if not exists goals_user_status_updated_idx on public.goals(user_id, status, updated_at desc);
create index if not exists goals_user_status_target_idx on public.goals(user_id, status, target_date);
create index if not exists goal_milestones_goal_target_idx on public.goal_milestones(goal_id, target_date);
create index if not exists subjects_user_exam_idx on public.subjects(user_id, exam_date);
create index if not exists study_plans_user_created_idx on public.study_plans(user_id, created_at desc);
create index if not exists career_roadmaps_user_created_idx on public.career_roadmaps(user_id, created_at desc);
create index if not exists ai_memory_entries_user_type_status_idx on public.ai_memory_entries(user_id, memory_type, status, updated_at desc);
create index if not exists planner_interactions_user_created_idx on public.planner_interactions(user_id, created_at desc) where meaningful;
create index if not exists learned_preferences_user_updated_idx on public.learned_preferences(user_id, updated_at desc);
create index if not exists weekly_reflections_user_period_idx on public.weekly_reflections(user_id, period_start desc);
create index if not exists monthly_reports_user_period_idx on public.monthly_performance_reports(user_id, period_start desc);
create index if not exists habit_insights_user_key_idx on public.habit_insights(user_id, insight_key);
create index if not exists adaptive_recommendations_user_status_idx on public.adaptive_recommendations(user_id, status, created_at desc);
create index if not exists coaching_messages_user_created_idx on public.coaching_messages(user_id, created_at desc);
create index if not exists predictions_user_type_idx on public.predictions(user_id, prediction_type, generated_at desc);
create index if not exists reflection_timeline_user_date_idx on public.reflection_timeline_events(user_id, occurred_at desc);

-- ── Timestamp triggers ──────────────────────────────────────────────────────
create or replace function public.set_updated_at() returns trigger language plpgsql security invoker set search_path = public as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists student_profiles_updated_at on public.student_profiles;
create trigger student_profiles_updated_at before update on public.student_profiles for each row execute function public.set_updated_at();
drop trigger if exists user_preferences_updated_at on public.user_preferences;
create trigger user_preferences_updated_at before update on public.user_preferences for each row execute function public.set_updated_at();
drop trigger if exists goals_updated_at on public.goals;
create trigger goals_updated_at before update on public.goals for each row execute function public.set_updated_at();
drop trigger if exists career_profiles_updated_at on public.career_profiles;
create trigger career_profiles_updated_at before update on public.career_profiles for each row execute function public.set_updated_at();
drop trigger if exists memory_profile_updated_at on public.user_memory_profiles;
create trigger memory_profile_updated_at before update on public.user_memory_profiles for each row execute function public.set_updated_at();
drop trigger if exists memory_entries_updated_at on public.ai_memory_entries;
create trigger memory_entries_updated_at before update on public.ai_memory_entries for each row execute function public.set_updated_at();
drop trigger if exists learned_preferences_updated_at on public.learned_preferences;
create trigger learned_preferences_updated_at before update on public.learned_preferences for each row execute function public.set_updated_at();
drop trigger if exists habit_insights_updated_at on public.habit_insights;
create trigger habit_insights_updated_at before update on public.habit_insights for each row execute function public.set_updated_at();
drop trigger if exists adaptive_recommendations_updated_at on public.adaptive_recommendations;
create trigger adaptive_recommendations_updated_at before update on public.adaptive_recommendations for each row execute function public.set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.student_profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.goals enable row level security;
alter table public.goal_milestones enable row level security;
alter table public.student_tasks enable row level security;
alter table public.deadlines enable row level security;
alter table public.planner_runs enable row level security;
alter table public.ai_recommendations enable row level security;
alter table public.activity_events enable row level security;
alter table public.subjects enable row level security;
alter table public.study_plans enable row level security;
alter table public.career_profiles enable row level security;
alter table public.career_roadmaps enable row level security;
alter table public.user_memory_profiles enable row level security;
alter table public.ai_memory_entries enable row level security;
alter table public.planner_interactions enable row level security;
alter table public.learned_preferences enable row level security;
alter table public.weekly_reflections enable row level security;
alter table public.monthly_performance_reports enable row level security;
alter table public.habit_insights enable row level security;
alter table public.adaptive_recommendations enable row level security;
alter table public.coaching_messages enable row level security;
alter table public.predictions enable row level security;
alter table public.reflection_timeline_events enable row level security;

-- All tables are single-tenant; the policy deliberately permits only the owning user.
do $$ declare t text; begin
  foreach t in array array['student_profiles','user_preferences','goals','goal_milestones','student_tasks','deadlines','planner_runs','ai_recommendations','activity_events','subjects','study_plans','career_profiles','career_roadmaps','user_memory_profiles','ai_memory_entries','planner_interactions','learned_preferences','weekly_reflections','monthly_performance_reports','habit_insights','adaptive_recommendations','coaching_messages','predictions','reflection_timeline_events'] loop
    execute format('drop policy if exists "Users manage own rows" on public.%I', t);
    execute format('create policy "Users manage own rows" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;

-- ── Optional, safe seed data ────────────────────────────────────────────────
-- The function is executable but does not run automatically. It requires an existing
-- auth.users UUID, preserving the foreign key and RLS model. Example:
-- select public.seed_studentos_demo('YOUR_AUTH_USER_UUID'::uuid);
create or replace function public.seed_studentos_demo(p_user_id uuid) returns void language plpgsql security invoker set search_path = public as $$
declare career_goal uuid; study_goal uuid;
begin
  if not exists (select 1 from auth.users where id = p_user_id) then raise exception 'User % does not exist in auth.users', p_user_id; end if;
  insert into public.student_profiles(user_id, display_name, semester, career_goals, skills, preferred_study_hours, internship_interests, hackathon_interests, learning_goals)
  values (p_user_id, 'Aarav Mehta', 'Semester 6', array['Frontend internship'], array['React','TypeScript','SQL'], 'Weekdays, 7–9 PM', array['Product engineering'], array['EdTech'], 'Master data structures') on conflict (user_id) do nothing;
  insert into public.user_preferences(user_id) values (p_user_id) on conflict (user_id) do nothing;
  insert into public.goals(user_id,title,category,target_date,progress,status) values (p_user_id,'Secure a frontend internship','Career',current_date + 45,76,'active') returning id into career_goal;
  insert into public.goals(user_id,title,category,target_date,progress,status) values (p_user_id,'Master data structures','Academic',current_date + 60,68,'active') returning id into study_goal;
  insert into public.goal_milestones(user_id,goal_id,title,target_date) values (p_user_id,career_goal,'Submit four tailored applications',current_date + 7),(p_user_id,study_goal,'Complete dynamic programming patterns',current_date + 10);
  insert into public.student_tasks(user_id,title,due_at,priority,estimated_hours,status) values (p_user_id,'Finish system design case study',now() + interval '1 day','High',2,'todo'),(p_user_id,'Revise dynamic programming patterns',now() + interval '2 days','High',1.5,'todo');
  insert into public.deadlines(user_id,title,due_at,category) values (p_user_id,'Internship application',now() + interval '5 days','Career'),(p_user_id,'Algorithms mid-semester',now() + interval '12 days','Academic');
  insert into public.weekly_reflections(user_id,period_start,period_end,metrics,insights) values (p_user_id,current_date - 6,current_date,jsonb_build_object('productivityScore',87,'consistencyScore',82,'focusScore',79,'estimatedStudyHours',18.5),jsonb_build_array('Evening focus sessions are your most consistent pattern.')) on conflict (user_id,period_start) do nothing;
end;
$$;
