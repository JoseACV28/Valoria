-- Preserve searchable metadata already entered by writers.
alter table public.stories
  add column if not exists characters text[] not null default '{}',
  add column if not exists tags text[] not null default '{}';

notify pgrst, 'reload schema';
