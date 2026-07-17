create table public.subjects (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, exam_date date not null, confidence integer not null default 3 check (confidence between 1 and 5), created_at timestamptz not null default now()
);
create table public.study_plans (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, plan jsonb not null, created_at timestamptz not null default now()
);
alter table public.subjects enable row level security;
alter table public.study_plans enable row level security;
create policy "Users manage own subjects" on public.subjects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own study plans" on public.study_plans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index subjects_user_exam_idx on public.subjects (user_id, exam_date);
create index study_plans_user_created_idx on public.study_plans (user_id, created_at desc);
