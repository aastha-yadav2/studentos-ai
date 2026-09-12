-- ── Phase 11B: Scheduled Opportunity Ingestion Migration ──────────────────────
-- Migration: 20260718110000_schedule_opportunity_ingestion.sql

-- 1. Ingestion Concurrency Lock Table
create table if not exists public.opportunity_ingestion_locks (
  lock_name text primary key,
  acquired_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  run_id text
);

-- RLS Configuration for lock table
alter table public.opportunity_ingestion_locks enable row level security;

drop policy if exists "Authenticated users can read ingestion locks" on public.opportunity_ingestion_locks;
create policy "Authenticated users can read ingestion locks"
  on public.opportunity_ingestion_locks for select to authenticated using (true);

grant select on public.opportunity_ingestion_locks to authenticated;
revoke all on public.opportunity_ingestion_locks from anon;

-- 2. Enable pg_cron and pg_net extensions for automated scheduling
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- 3. Schedule automatic multi-source opportunity ingestion every 6 hours (0 */6 * * *)
select cron.schedule(
  'scheduled-opportunity-ingest',
  '0 */6 * * *',
  $$
  select net.http_post(
    url := 'https://bbqejddthfaokrjygemi.supabase.co/functions/v1/opportunity-ingest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-ingestion-secret', 'studentos_ingest_secret_2026'
    ),
    body := jsonb_build_object('execution_mode', 'scheduled')
  );
  $$
);
