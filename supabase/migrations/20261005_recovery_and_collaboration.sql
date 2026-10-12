begin;
alter table public.stories add column if not exists deleted_at timestamptz;
alter table public.stories add column if not exists moderation_hidden_at timestamptz;
alter table public.illustration_posts add column if not exists deleted_at timestamptz;
alter table public.illustration_posts add column if not exists moderation_hidden_at timestamptz;
alter table public.chapters add column if not exists deleted_at timestamptz;
alter table public.collaboration_invites add column if not exists editorial_access text not null default 'none' check(editorial_access in ('none','read','suggest'));
alter table public.site_admin_audit add column if not exists outcome text not null default 'requested' check(outcome in ('requested','completed','failed'));
alter table public.site_admin_audit add column if not exists completed_at timestamptz;
create table if not exists public.collaboration_suggestions (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references public.collaboration_invites(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  quote text not null default '',
  note text not null,
  status text not null default 'pending' check(status in ('pending','reviewed','dismissed')),
  created_at timestamptz not null default now()
);
alter table public.collaboration_suggestions enable row level security;
revoke all on public.collaboration_suggestions from anon, authenticated;
grant all on public.collaboration_suggestions to service_role;
-- Read access always passes through the server, including old browser policies.
revoke select on public.stories, public.chapters, public.illustration_posts from anon, authenticated;
create or replace function public.can_read_media(bucket text, object_path text, actor uuid)
returns boolean language sql stable set search_path=public as $$
  select
    (actor is not null and split_part(object_path,'/',1)=actor::text)
    or exists(select 1 from public.profiles p where
      right(p.avatar_url,length('/'||bucket||'/'||object_path))='/'||bucket||'/'||object_path
      or right(p.cover_url,length('/'||bucket||'/'||object_path))='/'||bucket||'/'||object_path)
    or exists(select 1 from public.stories s where
      s.deleted_at is null and s.moderation_hidden_at is null and (s.status='published' or s.author_id=actor or exists(select 1 from public.collaboration_invites ci where ci.work_id=s.id and ci.work_type='story' and ci.recipient_id=actor and ci.status='accepted' and ci.editorial_access in ('read','suggest')))
      and right(s.cover_url,length('/'||bucket||'/'||object_path))='/'||bucket||'/'||object_path)
    or exists(select 1 from public.chapter_images i join public.chapters c on c.id=i.chapter_id join public.stories s on s.id=c.story_id where
      s.deleted_at is null and s.moderation_hidden_at is null and c.deleted_at is null and ((s.status='published' and c.status='published') or s.author_id=actor or i.contributor_id=actor or exists(select 1 from public.collaboration_invites ci where ci.work_id=s.id and ci.work_type='story' and ci.recipient_id=actor and ci.status='accepted' and ci.editorial_access in ('read','suggest')))
      and right(i.public_url,length('/'||bucket||'/'||object_path))='/'||bucket||'/'||object_path)
    or exists(select 1 from public.illustration_posts p where
      p.deleted_at is null and p.moderation_hidden_at is null and ((p.status='published' and p.visibility in ('public','unlisted')) or p.author_id=actor)
      and right(p.cover_url,length('/'||bucket||'/'||object_path))='/'||bucket||'/'||object_path)
    or exists(select 1 from public.illustration_images i join public.illustration_posts p on p.id=i.illustration_post_id where
      p.deleted_at is null and p.moderation_hidden_at is null and ((p.status='published' and p.visibility in ('public','unlisted')) or p.author_id=actor)
      and right(i.public_url,length('/'||bucket||'/'||object_path))='/'||bucket||'/'||object_path)
    or exists(select 1 from public.illustration_fanarts i join public.illustration_posts p on p.id=i.illustration_post_id where
      p.deleted_at is null and p.moderation_hidden_at is null and ((p.status='published' and p.visibility in ('public','unlisted')) or p.author_id=actor or i.contributor_id=actor)
      and right(i.public_url,length('/'||bucket||'/'||object_path))='/'||bucket||'/'||object_path);
$$;
revoke all on function public.can_read_media(text,text,uuid) from public, anon, authenticated;
grant execute on function public.can_read_media(text,text,uuid) to service_role;
commit;
