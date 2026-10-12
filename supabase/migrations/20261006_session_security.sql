begin;

-- No users, passwords or factors are changed by this migration.
create table if not exists public.site_session_state (
  session_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz
);
alter table public.site_session_state enable row level security;
revoke all on public.site_session_state from public, anon, authenticated;
grant select, insert, update, delete on public.site_session_state to service_role;
create index if not exists site_session_state_user_idx on public.site_session_state(user_id);

create or replace function public.verify_site_session(
  p_session_id uuid, p_user_id uuid, p_max_age_seconds integer, p_idle_seconds integer
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_session jsonb;
  v_last_seen timestamptz;
  v_revoked timestamptz;
  v_created timestamptz;
  v_mfa boolean;
begin
  if p_session_id is null or p_user_id is null
     or p_max_age_seconds is null or p_idle_seconds is null
     or p_max_age_seconds not between 300 and 2678400
     or p_idle_seconds not between 300 and 2678400 then
    return jsonb_build_object('active', false);
  end if;
  select to_jsonb(s) into v_session from auth.sessions s
    join auth.users u on u.id = s.user_id
    where s.id = p_session_id and s.user_id = p_user_id
      and (u.banned_until is null or u.banned_until <= now());
  if v_session is null then return jsonb_build_object('active', false); end if;
  v_created := (v_session->>'created_at')::timestamptz;
  if v_created is null or v_created + make_interval(secs => p_max_age_seconds) <= now()
     or ((v_session->>'not_after') is not null and (v_session->>'not_after')::timestamptz <= now()) then
    return jsonb_build_object('active', false);
  end if;
  insert into public.site_session_state(session_id, user_id) values(p_session_id,p_user_id)
    on conflict(session_id) do nothing;
  select last_seen_at, revoked_at into v_last_seen, v_revoked from public.site_session_state
    where session_id = p_session_id and user_id = p_user_id for update;
  if not found or v_revoked is not null or v_last_seen + make_interval(secs => p_idle_seconds) <= now() then
    return jsonb_build_object('active', false);
  end if;
  update public.site_session_state set last_seen_at = now()
    where session_id = p_session_id and user_id = p_user_id;
  select exists(select 1 from auth.mfa_factors f where f.user_id=p_user_id and f.status='verified') into v_mfa;
  return jsonb_build_object('active', true, 'mfa_enrolled', v_mfa);
end;
$$;

create or replace function public.revoke_site_session(p_session_id uuid, p_user_id uuid)
returns void language sql security definer set search_path = '' as $$
  insert into public.site_session_state(session_id,user_id,revoked_at)
    select s.id,s.user_id,now() from auth.sessions s where s.id=p_session_id and s.user_id=p_user_id
    on conflict(session_id) do update set revoked_at=now()
    where public.site_session_state.user_id=p_user_id;
$$;
revoke all on function public.verify_site_session(uuid,uuid,integer,integer) from public, anon, authenticated;
revoke all on function public.revoke_site_session(uuid,uuid) from public, anon, authenticated;
grant execute on function public.verify_site_session(uuid,uuid,integer,integer) to service_role;
grant execute on function public.revoke_site_session(uuid,uuid) to service_role;

-- The frontend uses the application API for these private features. Direct REST
-- access would bypass session revocation and MFA checks in the API.
revoke all on public.user_workspace, public.collaboration_invites, public.content_reports,
  public.user_notifications from public, anon, authenticated;
grant all on public.user_workspace, public.collaboration_invites, public.content_reports,
  public.user_notifications to service_role;

-- Preserve intended public reading and prevent bypassing API write controls.
do $$
declare v_name text;
begin
  foreach v_name in array array['profiles','stories','chapters','chapter_images','story_reviews',
    'story_review_likes','creator_wall_posts','creator_wall_comments','creator_wall_comment_likes',
    'profile_follows','profile_roles','illustration_series','illustration_posts','illustration_images',
    'illustration_categories','illustration_post_categories','illustration_tags','illustration_post_tags',
    'illustration_comments','illustration_comment_likes','illustration_post_likes','illustration_saves','illustration_fanarts']
  loop
    if to_regclass('public.'||v_name) is not null then
      execute format('revoke insert, update, delete, truncate, references, trigger on table public.%I from public, anon, authenticated',v_name);
    end if;
  end loop;
end $$;
notify pgrst, 'reload schema';
commit;
