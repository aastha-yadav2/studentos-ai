alter table public.student_profiles add column if not exists display_name text not null default '';

create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'dark' check (theme in ('light', 'dark', 'system')),
  task_reminders boolean not null default true,
  deadline_alerts boolean not null default true,
  weekly_summary boolean not null default true,
  product_updates boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;
create policy "Users manage own preferences" on public.user_preferences for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
