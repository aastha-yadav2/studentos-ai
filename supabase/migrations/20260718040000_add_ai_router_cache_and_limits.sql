create table public.ai_response_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_type text not null,
  request_hash text not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  unique (user_id, request_type, request_hash)
);
create table public.ai_daily_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (user_id, usage_date)
);
alter table public.ai_response_cache enable row level security;
alter table public.ai_daily_usage enable row level security;
create policy "Users read own AI cache" on public.ai_response_cache for select using (auth.uid() = user_id);
create policy "Users read own AI usage" on public.ai_daily_usage for select using (auth.uid() = user_id);
grant select on public.ai_response_cache, public.ai_daily_usage to authenticated;

-- Atomic per-user daily quota. The Edge Function is the only caller.
create or replace function public.consume_ai_quota(p_limit integer default 20)
returns boolean language plpgsql security definer set search_path = public as $$
declare allowed boolean;
begin
  insert into public.ai_daily_usage(user_id, usage_date, request_count)
  values (auth.uid(), current_date, 1)
  on conflict (user_id, usage_date) do update set request_count = public.ai_daily_usage.request_count + 1
  where public.ai_daily_usage.request_count < p_limit
  returning true into allowed;
  return coalesce(allowed, false);
end;
$$;
grant execute on function public.consume_ai_quota(integer) to authenticated;
