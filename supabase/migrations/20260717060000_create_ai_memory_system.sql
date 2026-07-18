alter table public.goals drop constraint if exists goals_status_check;
alter table public.goals add constraint goals_status_check check (status in ('active', 'completed', 'paused', 'archived'));
alter table public.goals add column if not exists archived_at timestamptz;

create table public.user_memory_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  semester text,
  degree text,
  university text,
  skills text[] not null default '{}',
  interests text[] not null default '{}',
  preferred_learning_style text,
  preferred_study_hours text,
  placement_goals text[] not null default '{}',
  internship_goals text[] not null default '{}',
  hackathon_interests text[] not null default '{}',
  career_aspirations text,
  updated_at timestamptz not null default now()
);

create table public.ai_memory_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  memory_type text not null check (memory_type in ('profile', 'goal', 'planner', 'conversation', 'preference', 'insight')),
  status text not null default 'active' check (status in ('active', 'archived')),
  summary text not null,
  content jsonb not null default '{}'::jsonb,
  source text not null default 'system',
  importance smallint not null default 3 check (importance between 1 and 5),
  last_referenced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.planner_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  planner_run_id uuid references public.planner_runs(id) on delete set null,
  interaction_type text not null check (interaction_type in ('request', 'plan_summary', 'outcome', 'feedback')),
  summary text not null,
  content jsonb not null default '{}'::jsonb,
  meaningful boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.learned_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  preference_key text not null,
  preference_value jsonb not null,
  confidence numeric(3,2) not null default 0.50 check (confidence between 0 and 1),
  evidence_count integer not null default 1 check (evidence_count > 0),
  source text not null default 'observed',
  updated_at timestamptz not null default now(),
  unique (user_id, preference_key)
);

alter table public.user_memory_profiles enable row level security;
alter table public.ai_memory_entries enable row level security;
alter table public.planner_interactions enable row level security;
alter table public.learned_preferences enable row level security;

create policy "Users manage own memory profile" on public.user_memory_profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own memory entries" on public.ai_memory_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own planner interactions" on public.planner_interactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own learned preferences" on public.learned_preferences for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index ai_memory_entries_user_type_status_idx on public.ai_memory_entries (user_id, memory_type, status, updated_at desc);
create index planner_interactions_user_created_idx on public.planner_interactions (user_id, created_at desc) where meaningful;
create index learned_preferences_user_updated_idx on public.learned_preferences (user_id, updated_at desc);
create index goals_user_status_updated_idx on public.goals (user_id, status, updated_at desc);

create or replace function public.set_memory_updated_at()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_memory_profiles_updated_at before update on public.user_memory_profiles
for each row execute function public.set_memory_updated_at();
create trigger ai_memory_entries_updated_at before update on public.ai_memory_entries
for each row execute function public.set_memory_updated_at();
create trigger learned_preferences_updated_at before update on public.learned_preferences
for each row execute function public.set_memory_updated_at();
