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
