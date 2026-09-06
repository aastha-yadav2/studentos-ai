-- ── Phase 8: Opportunity Freshness & Change Detection Migration ───────────
-- Migration: 20260718080000_create_opportunity_change_events.sql

-- 1. Create Change Events Audit Table
create table if not exists public.opportunity_change_events (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid references public.opportunities(id) on delete cascade,
  change_type text not null check (change_type in (
    'registration_opened',
    'registration_closed',
    'deadline_changed',
    'application_open_date_changed',
    'status_changed',
    'eligibility_changed',
    'required_skills_changed',
    'became_deprecated',
    'new_opportunity_discovered'
  )),
  field_changed text not null,
  old_value text,
  new_value text,
  summary text not null,
  detected_at timestamptz not null default now()
);

-- 2. Query Index on opportunity_id and detected_at
create index if not exists opportunity_change_events_opp_idx on public.opportunity_change_events(opportunity_id);
create index if not exists opportunity_change_events_detected_idx on public.opportunity_change_events(detected_at desc);

-- 3. Row Level Security (RLS) Policy
alter table public.opportunity_change_events enable row level security;

drop policy if exists "Authenticated users can read change events" on public.opportunity_change_events;
create policy "Authenticated users can read change events" on public.opportunity_change_events for select to authenticated using (true);

-- PostgREST Grants
grant select on public.opportunity_change_events to authenticated;
revoke all on public.opportunity_change_events from anon;
