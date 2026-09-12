-- ── Update Ingestion Runs Table Schema for Phase 11B Reporting ─────────────
-- Migration: 20260718130000_update_ingestion_runs_schema.sql

alter table public.opportunity_ingestion_runs add column if not exists is_live boolean default true;
alter table public.opportunity_ingestion_runs add column if not exists live_fetched_count integer default 0;
alter table public.opportunity_ingestion_runs add column if not exists fallback_count integer default 0;

-- Drop existing check constraint and add updated status constraint
alter table public.opportunity_ingestion_runs drop constraint if exists opportunity_ingestion_runs_status_check;

alter table public.opportunity_ingestion_runs add constraint opportunity_ingestion_runs_status_check
  check (status in (
    'success', 'live_success', 'fallback_active', 'partial_success', 'empty_success', 
    'fetch_failed', 'parse_failed', 'validation_failed', 
    'rate_limited', 'unsupported'
  ));
