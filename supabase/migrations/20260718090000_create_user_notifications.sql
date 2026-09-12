-- ── Phase 9: User Notifications & Preference Extensions ──────────────────────
-- Migration: 20260718090000_create_user_notifications.sql

-- 1. Create User Notifications Audit & Action Table
create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  notification_type text not null check (notification_type in (
    'new_high_match_opportunity',
    'registration_opened',
    'registration_closed',
    'deadline_changed',
    'deadline_approaching',
    'eligibility_changed',
    'skills_changed',
    'new_ambassador_opportunity',
    'opportunity_reactivated',
    'prep_tasks_incomplete',
    'weekly_opportunity_digest'
  )),
  title text not null,
  message text not null,
  severity text not null default 'medium' check (severity in ('high', 'medium', 'low')),
  action_url text,
  metadata jsonb default '{}'::jsonb,
  dedupe_key text not null,
  read_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint user_notifications_user_dedupe_unique unique (user_id, dedupe_key)
);

-- 2. Extend User Preferences Table with Notification Specific Fields
alter table public.user_preferences
  add column if not exists new_opportunities boolean not null default true,
  add column if not exists opportunity_changes boolean not null default true,
  add column if not exists ambassador_alerts boolean not null default true,
  add column if not exists prep_reminders boolean not null default true,
  add column if not exists minimum_match_score integer not null default 80;

-- 3. Query Indexes for Performance
create index if not exists user_notifications_user_created_idx on public.user_notifications(user_id, created_at desc);
create index if not exists user_notifications_user_unread_idx on public.user_notifications(user_id, read_at) where read_at is null;
create index if not exists user_notifications_type_idx on public.user_notifications(notification_type);
create index if not exists user_notifications_opp_idx on public.user_notifications(opportunity_id);

-- 4. Row Level Security (RLS) Policy
alter table public.user_notifications enable row level security;

drop policy if exists "Users manage own notifications" on public.user_notifications;
create policy "Users manage own notifications" on public.user_notifications
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- PostgREST Grants
grant select, insert, update, delete on public.user_notifications to authenticated;
revoke all on public.user_notifications from anon;
