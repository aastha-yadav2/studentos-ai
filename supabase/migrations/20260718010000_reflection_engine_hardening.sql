-- Keeps reflection data fast and auditable as activity grows.
create index if not exists habit_insights_user_key_idx on public.habit_insights(user_id, insight_key);
create index if not exists coaching_messages_user_created_idx on public.coaching_messages(user_id, created_at desc);
create index if not exists student_tasks_user_status_completed_idx on public.student_tasks(user_id, status, completed_at desc);
create index if not exists goals_user_status_target_idx on public.goals(user_id, status, target_date);

create or replace function public.set_reflection_updated_at()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists adaptive_recommendations_set_updated_at on public.adaptive_recommendations;
create trigger adaptive_recommendations_set_updated_at
before update on public.adaptive_recommendations
for each row execute function public.set_reflection_updated_at();
