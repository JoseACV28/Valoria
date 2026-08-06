create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
add column if not exists bio text not null default '';
alter table public.profiles
add column if not exists avatar_url text not null default '';
alter table public.profiles
add column if not exists cover_url text not null default '';
alter table public.profiles
add column if not exists real_name text not null default '';

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles(id) on delete set null,
  title text not null,
  slug text not null unique,
  description text not null,
  excerpt text,
  category text not null,
  author_name text not null,
  cover_url text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  is_featured boolean not null default false,
  reads_count bigint not null default 0,
  rating_average numeric(2,1) not null default 0,
  rating_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.stories
add column if not exists author_id uuid references public.profiles(id) on delete set null;
alter table public.stories
add column if not exists rating_average numeric(2,1) not null default 0;
alter table public.stories
add column if not exists rating_count integer not null default 0;

create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  title text not null,
  slug text not null,
  chapter_number integer not null,
  excerpt text,
  content text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (story_id, chapter_number),
  unique (story_id, slug)
);

create table if not exists public.chapter_images (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  alt_text text,
  image_role text not null default 'creator' check (image_role in ('creator', 'community')),
  contributor_id uuid references public.profiles(id) on delete set null,
  contributor_name text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.chapter_images
add column if not exists image_role text not null default 'creator';
alter table public.chapter_images
add column if not exists contributor_id uuid references public.profiles(id) on delete set null;
alter table public.chapter_images
add column if not exists contributor_name text;

create table if not exists public.story_reviews (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  chapter_id uuid references public.chapters(id) on delete set null,
  parent_review_id uuid references public.story_reviews(id) on delete cascade,
  reviewer_id uuid references public.profiles(id) on delete set null,
  reviewer_name text not null,
  rating integer check (rating between 1 and 5),
  likes_count integer not null default 0,
  review_text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.story_review_likes (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.story_reviews(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (review_id, user_id)
);

create table if not exists public.creator_wall_posts (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  author_name text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.creator_wall_comments (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.creator_wall_posts(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  author_name text not null,
  parent_comment_id uuid references public.creator_wall_comments(id) on delete cascade,
  content text not null,
  likes_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.creator_wall_comment_likes (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.creator_wall_comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (comment_id, user_id)
);

create table if not exists public.profile_follows (
  id uuid primary key default gen_random_uuid(),
  followed_id uuid not null references public.profiles(id) on delete cascade,
  follower_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (followed_id, follower_id)
);

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text not null,
  actor_avatar_url text not null default '',
  type text not null,
  title text not null,
  body text not null default '',
  route_view text not null default '',
  route_identifier text not null default '',
  route_tab text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);


alter table public.story_reviews
add column if not exists parent_review_id uuid references public.story_reviews(id) on delete cascade;
alter table public.story_reviews
add column if not exists likes_count integer not null default 0;
alter table public.story_reviews
alter column rating drop not null;

create index if not exists stories_slug_idx on public.stories (slug);
create index if not exists chapters_story_id_idx on public.chapters (story_id);
create index if not exists chapter_images_chapter_id_idx on public.chapter_images (chapter_id);
create index if not exists story_reviews_story_id_idx on public.story_reviews (story_id);
create index if not exists story_review_likes_review_id_idx on public.story_review_likes (review_id);
create index if not exists story_review_likes_user_id_idx on public.story_review_likes (user_id);
create index if not exists creator_wall_posts_creator_id_idx on public.creator_wall_posts (creator_id);
create index if not exists creator_wall_comments_post_id_idx on public.creator_wall_comments (post_id);
create index if not exists creator_wall_comments_creator_id_idx on public.creator_wall_comments (creator_id);
create index if not exists creator_wall_comment_likes_comment_id_idx on public.creator_wall_comment_likes (comment_id);
create index if not exists creator_wall_comment_likes_user_id_idx on public.creator_wall_comment_likes (user_id);
create index if not exists profile_follows_followed_id_idx on public.profile_follows (followed_id);
create index if not exists profile_follows_follower_id_idx on public.profile_follows (follower_id);
create index if not exists user_notifications_recipient_id_idx on public.user_notifications (recipient_id);
create index if not exists user_notifications_read_at_idx on public.user_notifications (read_at);

alter table public.profiles enable row level security;
alter table public.stories enable row level security;
alter table public.chapters enable row level security;
alter table public.chapter_images enable row level security;
alter table public.story_reviews enable row level security;
alter table public.story_review_likes enable row level security;
alter table public.creator_wall_posts enable row level security;
alter table public.creator_wall_comments enable row level security;
alter table public.creator_wall_comment_likes enable row level security;
alter table public.profile_follows enable row level security;
alter table public.user_notifications enable row level security;

drop policy if exists "public can read profiles" on public.profiles;
create policy "public can read profiles"
on public.profiles
for select
to public
using (true);

drop policy if exists "service role manages profiles" on public.profiles;
create policy "service role manages profiles"
on public.profiles
for all
to service_role
using (true)
with check (true);

drop policy if exists "public can read stories" on public.stories;
create policy "public can read stories"
on public.stories
for select
to public
using (true);

drop policy if exists "service role manages stories" on public.stories;
create policy "service role manages stories"
on public.stories
for all
to service_role
using (true)
with check (true);

drop policy if exists "public can read chapters" on public.chapters;
create policy "public can read chapters"
on public.chapters
for select
to public
using (true);

drop policy if exists "service role manages chapters" on public.chapters;
create policy "service role manages chapters"
on public.chapters
for all
to service_role
using (true)
with check (true);

drop policy if exists "public can read chapter images" on public.chapter_images;
create policy "public can read chapter images"
on public.chapter_images
for select
to public
using (true);

drop policy if exists "public can read story reviews" on public.story_reviews;
create policy "public can read story reviews"
on public.story_reviews
for select
to public
using (true);

drop policy if exists "public can read story review likes" on public.story_review_likes;
create policy "public can read story review likes"
on public.story_review_likes
for select
to public
using (true);

drop policy if exists "service role manages chapter images" on public.chapter_images;
create policy "service role manages chapter images"
on public.chapter_images
for all
to service_role
using (true)
with check (true);

drop policy if exists "service role manages story reviews" on public.story_reviews;
create policy "service role manages story reviews"
on public.story_reviews
for all
to service_role
using (true)
with check (true);

drop policy if exists "service role manages story review likes" on public.story_review_likes;
create policy "service role manages story review likes"
on public.story_review_likes
for all
to service_role
using (true)
with check (true);

drop policy if exists "public can read creator wall posts" on public.creator_wall_posts;
create policy "public can read creator wall posts"
on public.creator_wall_posts
for select
to public
using (true);

drop policy if exists "public can read creator wall comments" on public.creator_wall_comments;
create policy "public can read creator wall comments"
on public.creator_wall_comments
for select
to public
using (true);

drop policy if exists "public can read creator wall comment likes" on public.creator_wall_comment_likes;
create policy "public can read creator wall comment likes"
on public.creator_wall_comment_likes
for select
to public
using (true);

drop policy if exists "service role manages creator wall posts" on public.creator_wall_posts;
create policy "service role manages creator wall posts"
on public.creator_wall_posts
for all
to service_role
using (true)
with check (true);

drop policy if exists "service role manages creator wall comments" on public.creator_wall_comments;
create policy "service role manages creator wall comments"
on public.creator_wall_comments
for all
to service_role
using (true)
with check (true);

drop policy if exists "service role manages creator wall comment likes" on public.creator_wall_comment_likes;
create policy "service role manages creator wall comment likes"
on public.creator_wall_comment_likes
for all
to service_role
using (true)
with check (true);

drop policy if exists "public can read profile follows" on public.profile_follows;
create policy "public can read profile follows"
on public.profile_follows
for select
to public
using (true);

drop policy if exists "service role manages profile follows" on public.profile_follows;
create policy "service role manages profile follows"
on public.profile_follows
for all
to service_role
using (true)
with check (true);

drop policy if exists "public can read own notifications" on public.user_notifications;
create policy "public can read own notifications"
on public.user_notifications
for select
to public
using (true);

drop policy if exists "service role manages user notifications" on public.user_notifications;
create policy "service role manages user notifications"
on public.user_notifications
for all
to service_role
using (true)
with check (true);


insert into storage.buckets (id, name, public)
values ('story-media', 'story-media', true)
on conflict (id) do nothing;

drop policy if exists "public can read story media" on storage.objects;
create policy "public can read story media"
on storage.objects
for select
to public
using (bucket_id = 'story-media');

drop policy if exists "service role can insert story media" on storage.objects;
create policy "service role can insert story media"
on storage.objects
for insert
to service_role
with check (bucket_id = 'story-media');

drop policy if exists "service role can update story media" on storage.objects;
create policy "service role can update story media"
on storage.objects
for update
to service_role
using (bucket_id = 'story-media')
with check (bucket_id = 'story-media');

drop policy if exists "service role can delete story media" on storage.objects;
create policy "service role can delete story media"
on storage.objects
for delete
to service_role
using (bucket_id = 'story-media');
