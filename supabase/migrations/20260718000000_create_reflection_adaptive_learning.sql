create table public.weekly_reflections (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null, period_end date not null, metrics jsonb not null default '{}'::jsonb, insights jsonb not null default '[]'::jsonb,
  generated_at timestamptz not null default now(), unique (user_id, period_start)
);
create table public.monthly_performance_reports (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null, period_end date not null, report jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(), unique (user_id, period_start)
);
create table public.habit_insights (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  insight_key text not null, insight_value jsonb not null, confidence numeric(3,2) not null default .5 check (confidence between 0 and 1), evidence_count integer not null default 1, updated_at timestamptz not null default now(), unique(user_id, insight_key)
);
create table public.adaptive_recommendations (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  recommendation_type text not null check (recommendation_type in ('schedule','workload','next_task','goal','skill','habit','project')),
  title text not null, rationale text not null, payload jsonb not null default '{}'::jsonb, status text not null default 'active' check (status in ('active','dismissed','completed')), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.coaching_messages (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  message_type text not null check (message_type in ('motivation','productivity','burnout','encouragement','focus','time_management')),
  message text not null, rationale text not null, created_at timestamptz not null default now()
);
create table public.predictions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  prediction_type text not null check (prediction_type in ('goal_completion','deadline_risk','project_completion','placement_readiness','internship_readiness','semester_forecast')),
  score numeric(5,2) not null check (score between 0 and 100), label text not null, explanation text not null, payload jsonb not null default '{}'::jsonb, generated_at timestamptz not null default now()
);
create table public.reflection_timeline_events (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('weekly_reflection','monthly_report','insight','milestone','achievement')),
  title text not null, description text, reference_id uuid, occurred_at timestamptz not null default now()
);
alter table public.weekly_reflections enable row level security; alter table public.monthly_performance_reports enable row level security; alter table public.habit_insights enable row level security; alter table public.adaptive_recommendations enable row level security; alter table public.coaching_messages enable row level security; alter table public.predictions enable row level security; alter table public.reflection_timeline_events enable row level security;
create policy "Users manage own weekly reflections" on public.weekly_reflections for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own monthly reports" on public.monthly_performance_reports for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own habit insights" on public.habit_insights for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own adaptive recommendations" on public.adaptive_recommendations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own coaching messages" on public.coaching_messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own predictions" on public.predictions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own reflection events" on public.reflection_timeline_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index weekly_reflections_user_period_idx on public.weekly_reflections(user_id, period_start desc);
create index monthly_reports_user_period_idx on public.monthly_performance_reports(user_id, period_start desc);
create index adaptive_recommendations_user_status_idx on public.adaptive_recommendations(user_id, status, created_at desc);
create index predictions_user_type_idx on public.predictions(user_id, prediction_type, generated_at desc);
create index reflection_timeline_user_date_idx on public.reflection_timeline_events(user_id, occurred_at desc);
