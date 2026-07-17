create table public.goal_milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  title text not null,
  target_date date,
  is_completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.goal_milestones enable row level security;

create policy "Users manage own goal milestones" on public.goal_milestones for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index goal_milestones_goal_target_idx on public.goal_milestones (goal_id, target_date);
