-- ── Allow Ingestion Edge Function R/W Access to Logs & Locks ────────────────
-- Migration: 20260718140000_allow_ingestion_runs_rw.sql

-- 1. Ingestion Runs Policies
drop policy if exists "Allow R/W for ingestion runs" on public.opportunity_ingestion_runs;
create policy "Allow R/W for ingestion runs" 
  on public.opportunity_ingestion_runs for all to anon, authenticated using (true) with check (true);

grant all on public.opportunity_ingestion_runs to anon, authenticated;

-- 2. Ingestion Locks Policies
drop policy if exists "Allow R/W for ingestion locks" on public.opportunity_ingestion_locks;
create policy "Allow R/W for ingestion locks" 
  on public.opportunity_ingestion_locks for all to anon, authenticated using (true) with check (true);

grant all on public.opportunity_ingestion_locks to anon, authenticated;
