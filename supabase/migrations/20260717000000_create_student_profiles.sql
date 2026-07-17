create table if not exists public.student_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  semester text not null,
  career_goals text[] not null default '{}',
  skills text[] not null default '{}',
  preferred_study_hours text not null,
  internship_interests text[] not null default '{}',
  hackathon_interests text[] not null default '{}',
  learning_goals text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.student_profiles enable row level security;

create policy "Users can view their own student profile"
  on public.student_profiles for select
  using (auth.uid() = user_id);

create policy "Users can create their own student profile"
  on public.student_profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own student profile"
  on public.student_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
