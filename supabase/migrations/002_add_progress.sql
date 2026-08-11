alter table public.study_progress
add column if not exists progress jsonb not null default '{}'::jsonb;
