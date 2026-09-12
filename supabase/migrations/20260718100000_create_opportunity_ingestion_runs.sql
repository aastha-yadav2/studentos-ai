-- ── Phase 11A: Live Ingestion & Run Logging Migration ────────────────────────
-- Migration: 20260718100000_create_opportunity_ingestion_runs.sql

-- 1. Add extra tracking fields to public.opportunities if not present
alter table public.opportunities add column if not exists source_record_id text;
alter table public.opportunities add column if not exists registration_url text;
alter table public.opportunities add column if not exists first_seen_at timestamptz default now();
alter table public.opportunities add column if not exists last_ingested_at timestamptz default now();
alter table public.opportunities add column if not exists ingestion_status text default 'active';
alter table public.opportunities add column if not exists content_hash text;

-- Index for fast lookup by source_platform + source_record_id
create index if not exists opportunities_source_platform_record_id_idx 
  on public.opportunities (source_platform, source_record_id);

-- Index for content_hash change detection
create index if not exists opportunities_content_hash_idx 
  on public.opportunities (content_hash);

-- 2. Ingestion Execution Run Log Table
create table if not exists public.opportunity_ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  source_platform text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null check (status in (
    'success', 'partial_success', 'empty_success', 
    'fetch_failed', 'parse_failed', 'validation_failed', 
    'rate_limited', 'unsupported'
  )),
  fetched_count integer not null default 0,
  normalized_count integer not null default 0,
  accepted_count integer not null default 0,
  duplicate_count integer not null default 0,
  rejected_count integer not null default 0,
  error_count integer not null default 0,
  error_summary text,
  metadata jsonb default '{}'::jsonb
);

-- Query index on runs table
create index if not exists opp_ingestion_runs_platform_status_idx 
  on public.opportunity_ingestion_runs (source_platform, status, started_at desc);

-- RLS Configuration
alter table public.opportunity_ingestion_runs enable row level security;

-- Read-only for authenticated users (admin observability)
drop policy if exists "Authenticated users can read ingestion runs" on public.opportunity_ingestion_runs;
create policy "Authenticated users can read ingestion runs" 
  on public.opportunity_ingestion_runs for select to authenticated using (true);

-- PostgREST Grants
grant select on public.opportunity_ingestion_runs to authenticated;
revoke all on public.opportunity_ingestion_runs from anon;
