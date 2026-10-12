begin;

create table if not exists public.story_review_likes (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.story_reviews(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (review_id, user_id)
);
create index if not exists story_review_likes_review_id_idx on public.story_review_likes(review_id);
create index if not exists story_review_likes_user_id_idx on public.story_review_likes(user_id);
alter table public.story_review_likes enable row level security;
revoke all on public.story_review_likes from public, anon, authenticated;
grant select, insert, update, delete on public.story_review_likes to service_role;

-- One transaction and one row lock keep the identity and counter consistent.
-- Only the trusted API may supply the authenticated user's identity.
create or replace function public.like_story_review(p_review_id uuid, p_user_id uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_review public.story_reviews%rowtype;
  v_inserted integer;
begin
  if p_user_id is null or not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'Usuario no disponible' using errcode = 'P0002';
  end if;

  select r.* into v_review
  from public.story_reviews r
  join public.stories s on s.id = r.story_id
  left join public.chapters c on c.id = r.chapter_id
  where r.id = p_review_id and s.deleted_at is null
    and (s.author_id = p_user_id or (s.status = 'published' and s.moderation_hidden_at is null))
    and (r.chapter_id is null or (c.deleted_at is null and (c.status = 'published' or s.author_id = p_user_id)))
  for update of r;
  if not found then
    raise exception 'Reseña no disponible' using errcode = 'P0002';
  end if;

  insert into public.story_review_likes(review_id, user_id)
  values (p_review_id, p_user_id)
  on conflict (review_id, user_id) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 1 then
    update public.story_reviews set likes_count = coalesce(likes_count, 0) + 1
    where id = p_review_id returning * into v_review;
  end if;
  return jsonb_build_object('review', to_jsonb(v_review), 'alreadyLiked', v_inserted = 0);
end;
$$;
revoke all on function public.like_story_review(uuid, uuid) from public, anon, authenticated;
grant execute on function public.like_story_review(uuid, uuid) to service_role;

-- Existing counters are retained. Old reactions cannot be attributed retroactively.
notify pgrst, 'reload schema';
commit;
