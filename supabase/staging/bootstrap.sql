-- SOLO PARA UN PROYECTO SUPABASE DE PRUEBAS NUEVO Y VACÍO.
-- No ejecutar en el proyecto principal. No copia usuarios ni obras.

-- SOURCE: schema.sql
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
alter table public.stories
add column if not exists characters text[] not null default '{}';
alter table public.stories
add column if not exists tags text[] not null default '{}';

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
using (status = 'published' or author_id = auth.uid());

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
using (exists (
  select 1 from public.stories s
  where s.id = chapters.story_id
    and ((s.status = 'published' and chapters.status = 'published') or s.author_id = auth.uid())
));

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
using (exists (select 1 from public.chapters c where c.id = chapter_images.chapter_id));

drop policy if exists "public can read story reviews" on public.story_reviews;
create policy "public can read story reviews"
on public.story_reviews
for select
to public
using (
  exists (select 1 from public.stories s where s.id = story_reviews.story_id)
  and (chapter_id is null or exists (select 1 from public.chapters c where c.id = story_reviews.chapter_id))
);

drop policy if exists "public can read story review likes" on public.story_review_likes;
create policy "public can read story review likes"
on public.story_review_likes
for select
to public
using (exists (select 1 from public.story_reviews r where r.id = story_review_likes.review_id));

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


-- SOURCE: illustrations-schema.sql
-- Extension schema para la vertical de ilustraciones en Valoria.
-- Este archivo es re-ejecutable y no reemplaza `supabase/schema.sql`:
-- lo complementa para habilitar perfiles ilustradores, posts visuales,
-- categorias, etiquetas, comentarios, likes y guardados.

create extension if not exists pgcrypto;

-- Roles creativos por perfil.
create table if not exists public.profile_roles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role_type text not null check (role_type in ('writer', 'illustrator')),
  created_at timestamptz not null default now(),
  unique (profile_id, role_type)
);

-- Series opcionales para agrupar ilustraciones por universo, saga o coleccion.
create table if not exists public.illustration_series (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  slug text not null unique,
  description text not null default '',
  cover_url text not null default '',
  visibility text not null default 'public' check (visibility in ('public', 'unlisted', 'private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Post principal de ilustracion.
create table if not exists public.illustration_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  series_id uuid references public.illustration_series(id) on delete set null,
  title text not null,
  slug text not null unique,
  description text not null default '',
  cover_url text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published')),
  visibility text not null default 'public' check (visibility in ('public', 'unlisted', 'private')),
  is_featured boolean not null default false,
  mature_content boolean not null default false,
  allow_comments boolean not null default true,
  views_count bigint not null default 0,
  likes_count integer not null default 0,
  comments_count integer not null default 0,
  saves_count integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Multiples imagenes por post: una pieza individual o galeria corta.
create table if not exists public.illustration_images (
  id uuid primary key default gen_random_uuid(),
  illustration_post_id uuid not null references public.illustration_posts(id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  alt_text text not null default '',
  width integer,
  height integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Catalogo visual de categorias.
create table if not exists public.illustration_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.illustration_post_categories (
  illustration_post_id uuid not null references public.illustration_posts(id) on delete cascade,
  category_id uuid not null references public.illustration_categories(id) on delete cascade,
  primary key (illustration_post_id, category_id)
);

-- Etiquetas libres reutilizables.
create table if not exists public.illustration_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.illustration_post_tags (
  illustration_post_id uuid not null references public.illustration_posts(id) on delete cascade,
  tag_id uuid not null references public.illustration_tags(id) on delete cascade,
  primary key (illustration_post_id, tag_id)
);

-- Comentarios y respuestas en ilustraciones.
create table if not exists public.illustration_comments (
  id uuid primary key default gen_random_uuid(),
  illustration_post_id uuid not null references public.illustration_posts(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  author_name text not null,
  parent_comment_id uuid references public.illustration_comments(id) on delete cascade,
  content text not null,
  likes_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.illustration_comment_likes (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.illustration_comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (comment_id, user_id)
);

-- Likes de posts visuales.
create table if not exists public.illustration_post_likes (
  id uuid primary key default gen_random_uuid(),
  illustration_post_id uuid not null references public.illustration_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (illustration_post_id, user_id)
);

-- Guardados tipo Pinterest para colecciones futuras.
create table if not exists public.illustration_saves (
  id uuid primary key default gen_random_uuid(),
  illustration_post_id uuid not null references public.illustration_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (illustration_post_id, user_id)
);

-- Fanarts de comunidad vinculados a una ilustracion publicada.
create table if not exists public.illustration_fanarts (
  id uuid primary key default gen_random_uuid(),
  illustration_post_id uuid not null references public.illustration_posts(id) on delete cascade,
  title text not null default 'Fanart de comunidad',
  storage_path text not null default '',
  public_url text not null,
  alt_text text not null default '',
  contributor_id uuid references public.profiles(id) on delete set null,
  contributor_name text,
  created_at timestamptz not null default now()
);

-- Indices de lectura/descubrimiento.
create index if not exists profile_roles_profile_id_idx
  on public.profile_roles (profile_id);
create index if not exists illustration_series_author_id_idx
  on public.illustration_series (author_id);
create index if not exists illustration_posts_author_id_idx
  on public.illustration_posts (author_id);
create index if not exists illustration_posts_series_id_idx
  on public.illustration_posts (series_id);
create index if not exists illustration_posts_slug_idx
  on public.illustration_posts (slug);
create index if not exists illustration_posts_status_idx
  on public.illustration_posts (status);
create index if not exists illustration_posts_visibility_idx
  on public.illustration_posts (visibility);
create index if not exists illustration_images_post_id_idx
  on public.illustration_images (illustration_post_id);
create index if not exists illustration_post_categories_category_idx
  on public.illustration_post_categories (category_id);
create index if not exists illustration_post_tags_tag_idx
  on public.illustration_post_tags (tag_id);
create index if not exists illustration_comments_post_id_idx
  on public.illustration_comments (illustration_post_id);
create index if not exists illustration_comments_parent_idx
  on public.illustration_comments (parent_comment_id);
create index if not exists illustration_comment_likes_comment_idx
  on public.illustration_comment_likes (comment_id);
create index if not exists illustration_post_likes_post_idx
  on public.illustration_post_likes (illustration_post_id);
create index if not exists illustration_saves_post_idx
  on public.illustration_saves (illustration_post_id);
create index if not exists illustration_fanarts_post_idx
  on public.illustration_fanarts (illustration_post_id);

-- RLS
alter table public.profile_roles enable row level security;
alter table public.illustration_series enable row level security;
alter table public.illustration_posts enable row level security;
alter table public.illustration_images enable row level security;
alter table public.illustration_categories enable row level security;
alter table public.illustration_post_categories enable row level security;
alter table public.illustration_tags enable row level security;
alter table public.illustration_post_tags enable row level security;
alter table public.illustration_comments enable row level security;
alter table public.illustration_comment_likes enable row level security;
alter table public.illustration_post_likes enable row level security;
alter table public.illustration_saves enable row level security;
alter table public.illustration_fanarts enable row level security;

-- Lectura publica.
drop policy if exists "public can read profile roles" on public.profile_roles;
create policy "public can read profile roles"
on public.profile_roles
for select
to public
using (true);

drop policy if exists "public can read illustration series" on public.illustration_series;
create policy "public can read illustration series"
on public.illustration_series
for select
to public
using (true);

drop policy if exists "public can read illustration posts" on public.illustration_posts;
create policy "public can read illustration posts"
on public.illustration_posts
for select
to public
using ((status = 'published' and visibility in ('public', 'unlisted')) or author_id = auth.uid());

drop policy if exists "public can read illustration images" on public.illustration_images;
create policy "public can read illustration images"
on public.illustration_images
for select
to public
using (exists (select 1 from public.illustration_posts p where p.id = illustration_images.illustration_post_id));

drop policy if exists "public can read illustration categories" on public.illustration_categories;
create policy "public can read illustration categories"
on public.illustration_categories
for select
to public
using (true);

drop policy if exists "public can read illustration post categories" on public.illustration_post_categories;
create policy "public can read illustration post categories"
on public.illustration_post_categories
for select
to public
using (exists (select 1 from public.illustration_posts p where p.id = illustration_post_categories.illustration_post_id));

drop policy if exists "public can read illustration tags" on public.illustration_tags;
create policy "public can read illustration tags"
on public.illustration_tags
for select
to public
using (true);

drop policy if exists "public can read illustration post tags" on public.illustration_post_tags;
create policy "public can read illustration post tags"
on public.illustration_post_tags
for select
to public
using (exists (select 1 from public.illustration_posts p where p.id = illustration_post_tags.illustration_post_id));

drop policy if exists "public can read illustration comments" on public.illustration_comments;
create policy "public can read illustration comments"
on public.illustration_comments
for select
to public
using (exists (select 1 from public.illustration_posts p where p.id = illustration_comments.illustration_post_id));

drop policy if exists "public can read illustration comment likes" on public.illustration_comment_likes;
create policy "public can read illustration comment likes"
on public.illustration_comment_likes
for select
to public
using (exists (select 1 from public.illustration_comments c where c.id = illustration_comment_likes.comment_id));

drop policy if exists "public can read illustration post likes" on public.illustration_post_likes;
create policy "public can read illustration post likes"
on public.illustration_post_likes
for select
to public
using (exists (select 1 from public.illustration_posts p where p.id = illustration_post_likes.illustration_post_id));

drop policy if exists "public can read illustration saves" on public.illustration_saves;
create policy "public can read illustration saves"
on public.illustration_saves
for select
to public
using (user_id = auth.uid());

drop policy if exists "public can read illustration fanarts" on public.illustration_fanarts;
create policy "public can read illustration fanarts"
on public.illustration_fanarts
for select
to public
using (exists (select 1 from public.illustration_posts p where p.id = illustration_fanarts.illustration_post_id));

-- Escritura segura por backend con service role.
drop policy if exists "service role manages profile roles" on public.profile_roles;
create policy "service role manages profile roles"
on public.profile_roles
for all
to service_role
using (true)
with check (true);

drop policy if exists "service role manages illustration series" on public.illustration_series;
create policy "service role manages illustration series"
on public.illustration_series
for all
to service_role
using (true)
with check (true);

drop policy if exists "service role manages illustration posts" on public.illustration_posts;
create policy "service role manages illustration posts"
on public.illustration_posts
for all
to service_role
using (true)
with check (true);

drop policy if exists "service role manages illustration images" on public.illustration_images;
create policy "service role manages illustration images"
on public.illustration_images
for all
to service_role
using (true)
with check (true);

drop policy if exists "service role manages illustration categories" on public.illustration_categories;
create policy "service role manages illustration categories"
on public.illustration_categories
for all
to service_role
using (true)
with check (true);

drop policy if exists "service role manages illustration post categories" on public.illustration_post_categories;
create policy "service role manages illustration post categories"
on public.illustration_post_categories
for all
to service_role
using (true)
with check (true);

drop policy if exists "service role manages illustration tags" on public.illustration_tags;
create policy "service role manages illustration tags"
on public.illustration_tags
for all
to service_role
using (true)
with check (true);

drop policy if exists "service role manages illustration post tags" on public.illustration_post_tags;
create policy "service role manages illustration post tags"
on public.illustration_post_tags
for all
to service_role
using (true)
with check (true);

drop policy if exists "service role manages illustration comments" on public.illustration_comments;
create policy "service role manages illustration comments"
on public.illustration_comments
for all
to service_role
using (true)
with check (true);

drop policy if exists "service role manages illustration comment likes" on public.illustration_comment_likes;
create policy "service role manages illustration comment likes"
on public.illustration_comment_likes
for all
to service_role
using (true)
with check (true);

drop policy if exists "service role manages illustration post likes" on public.illustration_post_likes;
create policy "service role manages illustration post likes"
on public.illustration_post_likes
for all
to service_role
using (true)
with check (true);

drop policy if exists "service role manages illustration saves" on public.illustration_saves;
create policy "service role manages illustration saves"
on public.illustration_saves
for all
to service_role
using (true)
with check (true);

drop policy if exists "service role manages illustration fanarts" on public.illustration_fanarts;
create policy "service role manages illustration fanarts"
on public.illustration_fanarts
for all
to service_role
using (true)
with check (true);

-- Datos iniciales de categorias visuales base.
insert into public.illustration_categories (name, slug)
values
  ('Personajes', 'personajes'),
  ('Paisajes', 'paisajes'),
  ('Concept art', 'concept-art'),
  ('Fanart', 'fanart'),
  ('Portadas', 'portadas'),
  ('Escenas', 'escenas'),
  ('Comics cortos', 'comics-cortos'),
  ('Moodboard', 'moodboard'),
  ('Fantasía', 'fantasia'),
  ('Ciencia ficción', 'ciencia-ficcion')
on conflict (slug) do nothing;


-- SOURCE: migrations/20261001-content-visibility.sql
-- Aplicar despues de schema.sql e illustrations-schema.sql.

-- Ajusta solo las politicas de lectura; no modifica tablas ni datos.

begin;

drop policy if exists "public can read stories" on public.stories;
create policy "public can read stories"
on public.stories
for select
to public
using (status = 'published' or author_id = auth.uid());

drop policy if exists "public can read chapters" on public.chapters;
create policy "public can read chapters"
on public.chapters
for select
to public
using (exists (
  select 1 from public.stories s
  where s.id = chapters.story_id
    and ((s.status = 'published' and chapters.status = 'published') or s.author_id = auth.uid())
));

drop policy if exists "public can read chapter images" on public.chapter_images;
create policy "public can read chapter images"
on public.chapter_images
for select
to public
using (exists (select 1 from public.chapters c where c.id = chapter_images.chapter_id));

drop policy if exists "public can read story reviews" on public.story_reviews;
create policy "public can read story reviews"
on public.story_reviews
for select
to public
using (
  exists (select 1 from public.stories s where s.id = story_reviews.story_id)
  and (chapter_id is null or exists (select 1 from public.chapters c where c.id = story_reviews.chapter_id))
);

drop policy if exists "public can read story review likes" on public.story_review_likes;
create policy "public can read story review likes"
on public.story_review_likes
for select
to public
using (exists (select 1 from public.story_reviews r where r.id = story_review_likes.review_id));

drop policy if exists "public can read illustration posts" on public.illustration_posts;
create policy "public can read illustration posts"
on public.illustration_posts
for select
to public
using ((status = 'published' and visibility in ('public', 'unlisted')) or author_id = auth.uid());

drop policy if exists "public can read illustration images" on public.illustration_images;
create policy "public can read illustration images"
on public.illustration_images
for select
to public
using (exists (select 1 from public.illustration_posts p where p.id = illustration_images.illustration_post_id));

drop policy if exists "public can read illustration post categories" on public.illustration_post_categories;
create policy "public can read illustration post categories"
on public.illustration_post_categories
for select
to public
using (exists (select 1 from public.illustration_posts p where p.id = illustration_post_categories.illustration_post_id));

drop policy if exists "public can read illustration post tags" on public.illustration_post_tags;
create policy "public can read illustration post tags"
on public.illustration_post_tags
for select
to public
using (exists (select 1 from public.illustration_posts p where p.id = illustration_post_tags.illustration_post_id));

drop policy if exists "public can read illustration comments" on public.illustration_comments;
create policy "public can read illustration comments"
on public.illustration_comments
for select
to public
using (exists (select 1 from public.illustration_posts p where p.id = illustration_comments.illustration_post_id));

drop policy if exists "public can read illustration comment likes" on public.illustration_comment_likes;
create policy "public can read illustration comment likes"
on public.illustration_comment_likes
for select
to public
using (exists (select 1 from public.illustration_comments c where c.id = illustration_comment_likes.comment_id));

drop policy if exists "public can read illustration post likes" on public.illustration_post_likes;
create policy "public can read illustration post likes"
on public.illustration_post_likes
for select
to public
using (exists (select 1 from public.illustration_posts p where p.id = illustration_post_likes.illustration_post_id));

drop policy if exists "public can read illustration saves" on public.illustration_saves;
create policy "public can read illustration saves"
on public.illustration_saves
for select
to public
using (user_id = auth.uid());

drop policy if exists "public can read illustration fanarts" on public.illustration_fanarts;
create policy "public can read illustration fanarts"
on public.illustration_fanarts
for select
to public
using (exists (select 1 from public.illustration_posts p where p.id = illustration_fanarts.illustration_post_id));

commit;


-- SOURCE: migrations/20261002_story_search_metadata.sql
-- Preserve searchable metadata already entered by writers.
alter table public.stories
  add column if not exists characters text[] not null default '{}',
  add column if not exists tags text[] not null default '{}';

notify pgrst, 'reload schema';


-- SOURCE: migrations/20261003_editorial_workspace.sql
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


-- SOURCE: migrations/20261003_community_tools.sql
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


-- SOURCE: migrations/20261004_site_administration.sql
begin;
create table if not exists public.site_admin_roles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  permissions text[] not null default '{}' check (permissions <@ array['users','settings','reports']::text[]),
  granted_by uuid not null references public.profiles(id),
  updated_at timestamptz not null default now()
);
create table if not exists public.site_settings (
  id text primary key check (id = 'general'),
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
create table if not exists public.site_admin_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id),
  action text not null,
  target_id text not null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.site_admin_roles enable row level security;
alter table public.site_settings enable row level security;
alter table public.site_admin_audit enable row level security;
-- No browser policies: permission changes go exclusively through the server.
revoke all on public.site_admin_roles, public.site_settings, public.site_admin_audit from anon, authenticated;
grant all on public.site_admin_roles, public.site_settings, public.site_admin_audit to service_role;
commit;


-- SOURCE: migrations/20261005_recovery_and_collaboration.sql
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


-- SOURCE: migrations/20261005_story_review_likes.sql
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


-- SOURCE: migrations/20261006_session_security.sql
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


-- SOURCE: migrations/20261006_reader_creator_experience.sql
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


-- SOURCE: migrations/20261007_launch_tools.sql
begin;
alter table public.site_admin_roles drop constraint if exists site_admin_roles_permissions_check;
alter table public.site_admin_roles add constraint site_admin_roles_permissions_check check(permissions <@ array['users','settings','reports','support']::text[]);
alter table public.site_settings drop constraint if exists site_settings_id_check;
alter table public.site_settings add constraint site_settings_id_check check(id in ('general','public-documents'));
create table if not exists public.support_tickets (
 id uuid primary key default gen_random_uuid(),number bigint generated always as identity unique,
 user_id uuid not null references public.profiles(id) on delete cascade,
 category text not null check(category in ('question','technical','suggestion','copyright')),
 subject text not null check(length(subject) between 5 and 160),
 status text not null default 'open' check(status in ('open','reviewing','resolved','closed')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.support_messages (
 id uuid primary key default gen_random_uuid(),ticket_id uuid not null references public.support_tickets(id) on delete cascade,
 sender_id uuid references public.profiles(id) on delete set null,staff boolean not null default false,
 content text not null check(length(content) between 5 and 4000),created_at timestamptz not null default now()
);
create index if not exists support_ticket_user on public.support_tickets(user_id,created_at desc);
create index if not exists support_message_ticket on public.support_messages(ticket_id,created_at);
create table if not exists public.operational_alerts (
 id uuid primary key default gen_random_uuid(),kind text not null, status text not null default 'open' check(status in ('open','resolved')),
 message text not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create unique index if not exists operational_alert_open on public.operational_alerts(kind) where status='open';
do $$ declare t text;begin
 foreach t in array array['support_tickets','support_messages','operational_alerts'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
end; $$;
grant usage,select on sequence public.support_tickets_number_seq to service_role;
create or replace function public.create_support_ticket(p_actor uuid,p_category text,p_subject text,p_content text) returns jsonb language plpgsql security definer set search_path='' as $$
declare ticket public.support_tickets;
begin
 insert into public.support_tickets(user_id,category,subject) values(p_actor,p_category,p_subject) returning * into ticket;
 insert into public.support_messages(ticket_id,sender_id,content) values(ticket.id,p_actor,p_content);
 return to_jsonb(ticket);
end; $$;
revoke all on function public.create_support_ticket(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.create_support_ticket(uuid,text,text,text) to service_role;
commit;
