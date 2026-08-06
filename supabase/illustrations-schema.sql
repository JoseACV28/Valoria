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
using (true);

drop policy if exists "public can read illustration images" on public.illustration_images;
create policy "public can read illustration images"
on public.illustration_images
for select
to public
using (true);

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
using (true);

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
using (true);

drop policy if exists "public can read illustration comments" on public.illustration_comments;
create policy "public can read illustration comments"
on public.illustration_comments
for select
to public
using (true);

drop policy if exists "public can read illustration comment likes" on public.illustration_comment_likes;
create policy "public can read illustration comment likes"
on public.illustration_comment_likes
for select
to public
using (true);

drop policy if exists "public can read illustration post likes" on public.illustration_post_likes;
create policy "public can read illustration post likes"
on public.illustration_post_likes
for select
to public
using (true);

drop policy if exists "public can read illustration saves" on public.illustration_saves;
create policy "public can read illustration saves"
on public.illustration_saves
for select
to public
using (true);

drop policy if exists "public can read illustration fanarts" on public.illustration_fanarts;
create policy "public can read illustration fanarts"
on public.illustration_fanarts
for select
to public
using (true);

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
