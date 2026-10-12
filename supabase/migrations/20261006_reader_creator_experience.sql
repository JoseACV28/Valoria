begin;

create table if not exists public.account_privacy_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','cancelled','reviewing','completed')),
  note text not null default '' check (length(note)<=2000),
  response text not null default '' check (length(response)<=2000),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists account_privacy_open on public.account_privacy_requests(user_id) where status in ('pending','reviewing');

create table if not exists public.chapter_versions (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  title text not null, content text not null, excerpt text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists chapter_versions_history on public.chapter_versions(chapter_id,created_at desc);
create or replace function public.capture_chapter_version() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if (old.title,old.content,old.excerpt) is distinct from (new.title,new.content,new.excerpt) then
    insert into public.chapter_versions(chapter_id,title,content,excerpt) values(old.id,old.title,coalesce(old.content,''),coalesce(old.excerpt,''));
    delete from public.chapter_versions where chapter_id=old.id and id in (select id from public.chapter_versions where chapter_id=old.id order by created_at desc,id desc offset 50);
  end if;
  return new;
end; $$;
drop trigger if exists chapter_version_capture on public.chapters;
create trigger chapter_version_capture before update on public.chapters for each row execute function public.capture_chapter_version();
revoke all on function public.capture_chapter_version() from public,anon,authenticated;

create or replace function public.restore_chapter_version(p_actor uuid,p_chapter uuid,p_version uuid,p_content text,p_title text) returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.chapters; v public.chapter_versions;
begin
  select * into c from public.chapters where id=p_chapter and deleted_at is null for update;
  if not found or not exists(select 1 from public.stories where id=c.story_id and author_id=p_actor and deleted_at is null) then raise exception 'not_found'; end if;
  if c.content is distinct from p_content or c.title is distinct from p_title then raise exception 'version_conflict'; end if;
  perform 1 from public.user_workspace where user_id=p_actor and namespace='drafts' and key='schedule:'||c.id::text for update;
  if exists(select 1 from public.user_workspace where user_id=p_actor and namespace='drafts' and key='schedule:'||c.id::text and data->>'state'='processing') then raise exception 'publication_processing'; end if;
  select * into v from public.chapter_versions where id=p_version and chapter_id=p_chapter;
  if not found then raise exception 'not_found'; end if;
  delete from public.user_workspace where user_id=p_actor and namespace='drafts' and key='schedule:'||c.id::text;
  update public.chapters set title=v.title,content=v.content,excerpt=v.excerpt,status='draft',published_at=null where id=c.id returning * into c;
  return to_jsonb(c);
end; $$;
revoke all on function public.restore_chapter_version(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.restore_chapter_version(uuid,uuid,uuid,text,text) to service_role;

create table if not exists public.work_details (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  work_type text not null check(work_type in ('story','illustration')),
  work_id uuid not null, series_name text not null default '' check(length(series_name)<=100),
  series_position integer not null default 1 check(series_position between 1 and 1000),
  data jsonb not null default '{}', updated_at timestamptz not null default now(),
  unique(work_type,work_id), check(octet_length(data::text)<=30000)
);
create unique index if not exists saga_order_unique on public.work_details(owner_id,lower(series_name),series_position) where work_type='story' and series_name<>'';
create table if not exists public.editorial_picks (
  id uuid primary key default gen_random_uuid(), work_type text not null check(work_type in ('story','illustration')),
  work_id uuid not null, heading text not null check(length(heading) between 1 and 100),
  note text not null default '' check(length(note)<=500), sort_order integer not null default 1 check(sort_order between 1 and 1000),
  starts_at timestamptz not null default now(), ends_at timestamptz not null, created_by uuid references public.profiles(id) on delete set null,
  unique(work_type,work_id), check(ends_at>starts_at)
);
alter table public.content_reports add column if not exists reporter_message text not null default '';
alter table public.content_reports add column if not exists appeal text not null default '';
alter table public.content_reports add column if not exists appealed_at timestamptz;

do $$ declare t text; begin
  foreach t in array array['account_privacy_requests','chapter_versions','work_details','editorial_picks'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon,authenticated',t);
    execute format('grant all on public.%I to service_role',t);
  end loop;
end; $$;
commit;
