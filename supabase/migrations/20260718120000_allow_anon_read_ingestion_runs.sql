-- ── Allow Read Access to Ingestion Logs & Locks for Observability ─────────────
-- Migration: 20260718120000_allow_anon_read_ingestion_runs.sql

drop policy if exists "Anon users can read ingestion runs" on public.opportunity_ingestion_runs;
create policy "Anon users can read ingestion runs" 
  on public.opportunity_ingestion_runs for select to anon using (true);

grant select on public.opportunity_ingestion_runs to anon;

drop policy if exists "Anon users can read ingestion locks" on public.opportunity_ingestion_locks;
create policy "Anon users can read ingestion locks" 
  on public.opportunity_ingestion_locks for select to anon using (true);

grant select on public.opportunity_ingestion_locks to anon;
