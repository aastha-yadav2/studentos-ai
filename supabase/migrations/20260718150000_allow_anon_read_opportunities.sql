-- ── Allow Anon Read Access to Opportunities and Change Events ───────────────
-- Migration: 20260718150000_allow_anon_read_opportunities.sql

drop policy if exists "Anon users can read public opportunities" on public.opportunities;
create policy "Anon users can read public opportunities" 
  on public.opportunities for select to anon using (true);

grant select on public.opportunities to anon;

create table if not exists public.opportunity_change_events (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid references public.opportunities(id) on delete set null,
  source_platform text,
  change_type text not null,
  field_changed text,
  old_value text,
  new_value text,
  description text,
  created_at timestamptz not null default now()
);

alter table public.opportunity_change_events enable row level security;

drop policy if exists "Anon users can read change events" on public.opportunity_change_events;
create policy "Anon users can read change events" 
  on public.opportunity_change_events for select to anon, authenticated using (true);

grant all on public.opportunity_change_events to anon, authenticated;

