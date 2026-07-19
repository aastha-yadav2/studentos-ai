-- PostgREST first checks PostgreSQL privileges, then RLS evaluates rows.
-- This migration grants the browser's `authenticated` role CRUD access to
-- every existing public table and sets the same privileges for tables created
-- by future Supabase migrations. RLS remains the row-level security boundary.

grant usage on schema public to authenticated;

-- Existing tables (ALTER DEFAULT PRIVILEGES is not retroactive).
grant select, insert, update, delete on all tables in schema public to authenticated;

-- Existing and future identity/serial sequences.
grant usage, select on all sequences in schema public to authenticated;

-- Future objects created by the migration owner (the `postgres` role in
-- Supabase SQL migrations). These defaults apply only to subsequently created
-- objects, hence the explicit grants above.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

alter default privileges in schema public
  grant usage, select on sequences to authenticated;

-- Keep unauthenticated browser requests out of all existing public tables.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
