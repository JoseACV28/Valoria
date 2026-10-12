begin;
alter table public.stories add column if not exists audience text not null default 'General';
alter table public.stories add column if not exists language text not null default 'Espanol';
alter table public.stories add column if not exists rights text not null default 'Todos los derechos reservados';
alter table public.stories add column if not exists mature boolean not null default false;
alter table public.stories add column if not exists submission_id uuid;
create unique index if not exists stories_submission_unique on public.stories(author_id, submission_id);

-- Only the server may read private profile columns. Public clients get a safe view.
drop policy if exists "public can read profiles" on public.profiles;
revoke select, update on public.profiles from anon, authenticated;
grant select (id, display_name, bio, avatar_url, cover_url, created_at, updated_at) on public.profiles to anon, authenticated;

create table if not exists public.user_workspace (
  user_id uuid not null references public.profiles(id) on delete cascade,
  namespace text not null check(namespace in ('drafts','library','notes','preferences','collections','blocks')),
  key text not null,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  primary key(user_id, namespace, key)
);
alter table public.user_workspace enable row level security;
drop policy if exists workspace_owner on public.user_workspace;
create policy workspace_owner on public.user_workspace for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check(target_type in ('profile','comment','story','illustration')),
  target_id uuid not null,
  reason text not null,
  status text not null default 'pending' check(status in ('pending','reviewing','resolved','dismissed')),
  resolution text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.content_reports enable row level security;
alter table public.profiles add column if not exists is_moderator boolean not null default false;

create or replace function public.create_story_with_chapter(actor uuid, submission uuid, story_data jsonb, chapter_data jsonb)
returns jsonb language plpgsql set search_path=public as $$
declare s public.stories; c public.chapters;
begin
  perform pg_advisory_xact_lock(hashtextextended(actor::text || submission::text,0));
  select * into s from public.stories where author_id=actor and submission_id=submission;
  if found then
    select * into c from public.chapters where story_id=s.id order by chapter_number limit 1;
    return jsonb_build_object('story',to_jsonb(s),'chapter',to_jsonb(c));
  end if;
  insert into public.stories(author_id,title,slug,description,excerpt,category,author_name,cover_url,status,characters,tags,audience,language,rights,mature,submission_id)
  values(actor,story_data->>'title',story_data->>'slug',story_data->>'description',story_data->>'excerpt',story_data->>'category',story_data->>'authorName',story_data->>'coverUrl',story_data->>'status',
    array(select jsonb_array_elements_text(coalesce(story_data->'characters','[]'))),array(select jsonb_array_elements_text(coalesce(story_data->'tags','[]'))),
    story_data->>'audience',story_data->>'language',story_data->>'rights',coalesce((story_data->>'mature')::boolean,false),submission) returning * into s;
  insert into public.chapters(story_id,title,slug,chapter_number,excerpt,content,status,published_at)
  values(s.id,'Capítulo 1','capitulo-1',1,story_data->>'excerpt',chapter_data->>'content',s.status,case when s.status='published' then now() else null end) returning * into c;
  return jsonb_build_object('story',to_jsonb(s),'chapter',to_jsonb(c));
end $$;
revoke all on function public.create_story_with_chapter(uuid,uuid,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.create_story_with_chapter(uuid,uuid,jsonb,jsonb) to service_role;

create or replace function public.increment_story_read(story uuid) returns public.stories language sql set search_path=public as $$
  update public.stories set reads_count=reads_count+1 where id=story and status='published' returning *;
$$;
revoke all on function public.increment_story_read(uuid) from public, anon, authenticated;
grant execute on function public.increment_story_read(uuid) to service_role;
-- Media are served by the API only after content authorization, with short-lived URLs.
insert into storage.buckets(id,name,public) values('story-private-media','story-private-media',false) on conflict(id) do update set public=false;
update storage.buckets set public=false where id='story-media';
drop policy if exists "public can read story media" on storage.objects;
commit;
