create table public.career_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  placement_goal text not null,
  target_date date,
  internships text[] not null default '{}',
  companies text[] not null default '{}',
  skills text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table public.career_roadmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  roadmap jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.career_profiles enable row level security;
alter table public.career_roadmaps enable row level security;

create policy "Users manage own career profile" on public.career_profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own career roadmaps" on public.career_roadmaps for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index career_roadmaps_user_created_idx on public.career_roadmaps (user_id, created_at desc);
