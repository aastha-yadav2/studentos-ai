create table public.goals (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, category text not null default 'Academic', target_date date, progress integer not null default 0 check (progress between 0 and 100), status text not null default 'active' check (status in ('active', 'completed', 'paused')), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.student_tasks (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, due_at timestamptz, priority text not null default 'Medium' check (priority in ('High', 'Medium', 'Low')), estimated_hours numeric(5,2), status text not null default 'todo' check (status in ('todo', 'in_progress', 'completed')), created_at timestamptz not null default now(), completed_at timestamptz
);
create table public.deadlines (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, due_at timestamptz not null, category text not null default 'Academic', created_at timestamptz not null default now()
);
create table public.planner_runs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, goal text not null, goal_type text not null, plan jsonb not null, created_at timestamptz not null default now()
);
create table public.ai_recommendations (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  content text not null, source text not null default 'Planner', is_dismissed boolean not null default false, created_at timestamptz not null default now()
);
create table public.activity_events (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null, description text not null, created_at timestamptz not null default now()
);

alter table public.goals enable row level security;
alter table public.student_tasks enable row level security;
alter table public.deadlines enable row level security;
alter table public.planner_runs enable row level security;
alter table public.ai_recommendations enable row level security;
alter table public.activity_events enable row level security;

create policy "Users manage own goals" on public.goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own tasks" on public.student_tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own deadlines" on public.deadlines for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own planner runs" on public.planner_runs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own recommendations" on public.ai_recommendations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own activity" on public.activity_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index student_tasks_user_due_idx on public.student_tasks (user_id, due_at);
create index deadlines_user_due_idx on public.deadlines (user_id, due_at);
create index planner_runs_user_created_idx on public.planner_runs (user_id, created_at desc);
