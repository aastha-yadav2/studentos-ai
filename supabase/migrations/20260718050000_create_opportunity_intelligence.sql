-- ── Opportunity Intelligence System Database Schema ─────────────────────────
-- Migration: 20260718050000_create_opportunity_intelligence.sql

-- Helper function for timestamp updating
create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 1. Verified Public Opportunity Catalog (Read-only for authenticated users)
create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  organization text not null,
  type text not null check (type in ('hackathon','internship','job','fellowship','grant','competition')),
  category text not null default 'Software Engineering',
  description text not null,
  eligibility text[] not null default '{}',
  required_skills text[] not null default '{}',
  location text not null default 'Remote',
  stipend_prize text,
  source_url text not null,
  source_platform text not null default 'Curated',
  deadline timestamptz,
  status text not null default 'active' check (status in ('active','expired','archived')),
  verification_state text not null default 'verified' check (verification_state in ('verified','pending','deprecated')),
  last_verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_platform, source_url)
);

-- 2. Decoupled AI Opportunity Match Scoring (Independent of applications)
create table if not exists public.opportunity_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  match_score integer not null check (match_score between 0 and 100),
  skill_match_score integer not null check (skill_match_score between 0 and 100),
  goal_match_score integer not null check (goal_match_score between 0 and 100),
  strengths text[] not null default '{}',
  missing_skills text[] not null default '{}',
  explanation text not null,
  computed_at timestamptz not null default now(),
  unique (user_id, opportunity_id)
);

-- 3. User Saved / Bookmarked Opportunities
create table if not exists public.user_opportunity_saved (
  user_id uuid references auth.users(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (user_id, opportunity_id)
);

-- 4. User Application Workflow Tracker
create table if not exists public.user_opportunity_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  status text not null default 'saved' check (status in (
    'saved', 'interested', 'applying', 'applied',
    'interviewing', 'accepted', 'rejected', 'withdrawn',
    'not_eligible', 'deadline_passed'
  )),
  applied_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, opportunity_id)
);

-- 5. AI Preparation Plans (Linked to Opportunity + User)
create table if not exists public.opportunity_prep_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  plan jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, opportunity_id)
);

-- ── Query Indexes ──────────────────────────────────────────────────────────
create index if not exists opportunities_status_idx on public.opportunities(status);
create index if not exists opportunities_deadline_idx on public.opportunities(deadline);
create index if not exists opportunities_type_idx on public.opportunities(type);
create index if not exists opportunities_category_idx on public.opportunities(category);
create index if not exists opportunities_status_deadline_idx on public.opportunities(status, deadline);
create index if not exists opportunities_type_cat_idx on public.opportunities(type, category);
create index if not exists opportunity_matches_user_score_idx on public.opportunity_matches(user_id, match_score desc);
create index if not exists user_opp_apps_user_status_idx on public.user_opportunity_applications(user_id, status);

-- ── Timestamp Triggers ─────────────────────────────────────────────────────
drop trigger if exists opportunities_updated_at on public.opportunities;
create trigger opportunities_updated_at before update on public.opportunities for each row execute function public.set_updated_at();

drop trigger if exists user_opp_apps_updated_at on public.user_opportunity_applications;
create trigger user_opp_apps_updated_at before update on public.user_opportunity_applications for each row execute function public.set_updated_at();

drop trigger if exists opp_prep_plans_updated_at on public.opportunity_prep_plans;
create trigger opp_prep_plans_updated_at before update on public.opportunity_prep_plans for each row execute function public.set_updated_at();

-- ── Row Level Security (RLS) ───────────────────────────────────────────────
alter table public.opportunities enable row level security;
alter table public.opportunity_matches enable row level security;
alter table public.user_opportunity_saved enable row level security;
alter table public.user_opportunity_applications enable row level security;
alter table public.opportunity_prep_plans enable row level security;

-- Public opportunities catalog read-only for authenticated users
drop policy if exists "Authenticated users can read public opportunities" on public.opportunities;
create policy "Authenticated users can read public opportunities" on public.opportunities for select to authenticated using (true);

-- User-scoped policies matching existing RLS conventions
drop policy if exists "Users manage own matches" on public.opportunity_matches;
create policy "Users manage own matches" on public.opportunity_matches for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own saved opportunities" on public.user_opportunity_saved;
create policy "Users manage own saved opportunities" on public.user_opportunity_saved for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own applications" on public.user_opportunity_applications;
create policy "Users manage own applications" on public.user_opportunity_applications for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own prep plans" on public.opportunity_prep_plans;
create policy "Users manage own prep plans" on public.opportunity_prep_plans for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- PostgREST Grants
grant select on public.opportunities to authenticated;
grant select, insert, update, delete on public.opportunity_matches, public.user_opportunity_saved, public.user_opportunity_applications, public.opportunity_prep_plans to authenticated;
revoke all on public.opportunities, public.opportunity_matches, public.user_opportunity_saved, public.user_opportunity_applications, public.opportunity_prep_plans from anon;

-- ── Verified Real-World Opportunities Seed Data ────────────────────────────
-- Strictly authentic public tech programs with real verified source URLs.
insert into public.opportunities (
  title, organization, type, category, description,
  eligibility, required_skills, location, stipend_prize,
  source_url, source_platform, deadline, status, verification_state, last_verified_at
) values
(
  'Google Summer of Code',
  'Google',
  'fellowship',
  'Open Source Development',
  'Global online program focused on bringing new contributors into open source software development under 1-on-1 mentorship.',
  array['18+ years old', 'Enrolled in post-secondary education or beginner open-source contributor'],
  array['Git', 'Python', 'C++', 'Java', 'Go'],
  'Remote',
  'Stipend based on local purchasing power parity',
  'https://summerofcode.withgoogle.com',
  'Google',
  null,
  'active',
  'verified',
  now()
),
(
  'MLH Fellowship',
  'Major League Hacking',
  'fellowship',
  'Software Engineering',
  'A 12-week internship alternative where developers contribute to real-world open source projects used by millions.',
  array['Proficient in at least one programming language', 'Available 30-40 hours per week'],
  array['Git', 'JavaScript', 'Python', 'React', 'Node.js'],
  'Remote',
  'Need-based educational stipend provided',
  'https://fellowship.mlh.io',
  'Major League Hacking',
  null,
  'active',
  'verified',
  now()
),
(
  'Microsoft Imagine Cup',
  'Microsoft',
  'competition',
  'AI & Cloud Innovation',
  'Global student technology competition inviting teams to build innovative solutions utilizing Microsoft AI and Azure services.',
  array['Enrolled student age 18+', 'Teams of up to 4 members'],
  array['Azure', 'AI/ML', 'TypeScript', 'Python', 'Cloud Architecture'],
  'Remote / Global',
  '$100,000 USD + Mentorship with Microsoft CEO',
  'https://imaginecup.microsoft.com',
  'Microsoft',
  null,
  'active',
  'verified',
  now()
),
(
  'ETHGlobal Hackathons',
  'ETHGlobal',
  'hackathon',
  'Web3 & Blockchain',
  'Global Ethereum hackathon series bringing together developers to build decentralized applications and smart contracts.',
  array['Open to developers worldwide', 'Individual or team entry'],
  array['Solidity', 'TypeScript', 'React', 'Smart Contracts', 'Web3.js'],
  'Remote / Hybrid',
  'Over $500,000 in sponsor prize pools per event',
  'https://ethglobal.com',
  'ETHGlobal',
  null,
  'active',
  'verified',
  now()
),
(
  'Google Solution Challenge',
  'Google Developer Student Clubs',
  'competition',
  'Social Impact Tech',
  'Annual global competition inviting students to build solutions for UN 17 Sustainable Development Goals using Google technologies.',
  array['Member of a Google Developer Student Club at a university'],
  array['Flutter', 'Firebase', 'Google Cloud', 'TensorFlow', 'Android'],
  'Remote',
  'Top 3 teams receive $3,000 USD/member + Google Mentorship',
  'https://developers.google.com/community/gdsc-solution-challenge',
  'Google',
  null,
  'active',
  'verified',
  now()
),
(
  'Outreachy Internships',
  'Outreachy',
  'internship',
  'Open Source & Software Engineering',
  'Paid 13-week remote internships providing open source mentorship for people subject to systemic bias and underrepresented in tech.',
  array['18+ years old', 'Available 30 hours per week during internship cohort'],
  array['Git', 'Python', 'JavaScript', 'Documentation', 'Linux'],
  'Remote',
  '$7,000 USD total stipend',
  'https://www.outreachy.org',
  'Outreachy',
  null,
  'active',
  'verified',
  now()
)
on conflict (source_platform, source_url) do update set
  title = excluded.title,
  organization = excluded.organization,
  description = excluded.description,
  required_skills = excluded.required_skills,
  last_verified_at = now();

