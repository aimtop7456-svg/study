create table if not exists public.study_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stars jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.study_progress enable row level security;

grant select, insert, update, delete on table public.study_progress to authenticated;

create policy "Users can read own study progress"
on public.study_progress for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own study progress"
on public.study_progress for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own study progress"
on public.study_progress for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete own study progress"
on public.study_progress for delete to authenticated
using ((select auth.uid()) = user_id);
