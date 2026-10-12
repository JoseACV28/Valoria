begin;
alter table public.stories add column if not exists is_complete boolean not null default false;
alter table public.illustration_posts add column if not exists collection_name text not null default '';
alter table public.illustration_posts add column if not exists credits text not null default '';
alter table public.illustration_posts add column if not exists usage_rights text not null default 'Todos los derechos reservados';
create index if not exists workspace_library_key on public.user_workspace(namespace,key);

create table if not exists public.collaboration_invites (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  work_type text not null check(work_type in ('story','illustration')),
  work_id uuid not null,
  role text not null,
  note text not null default '',
  status text not null default 'pending' check(status in ('pending','accepted','declined','cancelled')),
  created_at timestamptz not null default now(),
  unique(sender_id,recipient_id,work_type,work_id)
);
alter table public.collaboration_invites enable row level security;

-- The server checks ownership before every editorial write.
revoke insert, update, delete on public.stories, public.chapters, public.chapter_images,
  public.illustration_posts, public.illustration_images, public.illustration_fanarts
  from anon, authenticated;

create or replace function public.can_read_media(bucket text, object_path text, actor uuid)
returns boolean language sql stable set search_path=public as $$
  select
    (actor is not null and split_part(object_path,'/',1)=actor::text)
    or exists(select 1 from public.profiles p where
      right(p.avatar_url,length('/'||bucket||'/'||object_path))='/'||bucket||'/'||object_path
      or right(p.cover_url,length('/'||bucket||'/'||object_path))='/'||bucket||'/'||object_path)
    or exists(select 1 from public.stories s where
      (s.status='published' or s.author_id=actor)
      and right(s.cover_url,length('/'||bucket||'/'||object_path))='/'||bucket||'/'||object_path)
    or exists(select 1 from public.chapter_images i join public.chapters c on c.id=i.chapter_id join public.stories s on s.id=c.story_id where
      ((s.status='published' and c.status='published') or s.author_id=actor or i.contributor_id=actor)
      and right(i.public_url,length('/'||bucket||'/'||object_path))='/'||bucket||'/'||object_path)
    or exists(select 1 from public.illustration_posts p where
      ((p.status='published' and p.visibility in ('public','unlisted')) or p.author_id=actor)
      and right(p.cover_url,length('/'||bucket||'/'||object_path))='/'||bucket||'/'||object_path)
    or exists(select 1 from public.illustration_images i join public.illustration_posts p on p.id=i.illustration_post_id where
      ((p.status='published' and p.visibility in ('public','unlisted')) or p.author_id=actor)
      and right(i.public_url,length('/'||bucket||'/'||object_path))='/'||bucket||'/'||object_path)
    or exists(select 1 from public.illustration_fanarts i join public.illustration_posts p on p.id=i.illustration_post_id where
      ((p.status='published' and p.visibility in ('public','unlisted')) or p.author_id=actor or i.contributor_id=actor)
      and right(i.public_url,length('/'||bucket||'/'||object_path))='/'||bucket||'/'||object_path);
$$;
revoke all on function public.can_read_media(text,text,uuid) from public, anon, authenticated;
grant execute on function public.can_read_media(text,text,uuid) to service_role;
commit;
