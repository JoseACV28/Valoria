// Modelo de ilustraciones.
// Resuelve galeria visual, detalle y metadatos de autor para la nueva vertical.
import { randomUUID } from "node:crypto";
import { isSupabaseEnabled, supabaseAdmin } from "../config/supabase.js";
import { slugify } from "../utils/slugify.js";

function isMissingIllustrationTable(message = "") {
  // Detecta errores esperables cuando la vertical de ilustraciones aun no fue instalada en la base.
  return (
    message.includes("illustration_posts") ||
    message.includes("illustration_images") ||
    message.includes("illustration_fanarts") ||
    message.includes("illustration_post_categories") ||
    message.includes("illustration_post_tags") ||
    message.includes("illustration_comments") ||
    message.includes("illustration_post_likes") ||
    message.includes("illustration_comment_likes")
  );
}

function mapIllustration(
  post,
  images = [],
  categories = [],
  tags = [],
  likedByCurrentUser = false
) {
  // Traduce el registro crudo de base al shape amigable que consume el frontend.
  const cover = post.cover_url || images[0]?.public_url || "";

  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    description: post.description || "",
    cover,
    coverUrl: cover,
    authorId: post.author_id,
    author: post.author_name || "Ilustrador de Valoria",
    authorAvatarUrl: post.author_avatar_url || "",
    status: post.status,
    visibility: post.visibility,
    isFeatured: Boolean(post.is_featured),
    matureContent: Boolean(post.mature_content || false),
    viewsCount: Number(post.views_count || 0),
    likesCount: Number(post.likes_count || 0),
    commentsCount: Number(post.comments_count || 0),
    savesCount: Number(post.saves_count || 0),
    likedByCurrentUser: Boolean(likedByCurrentUser),
    createdAt: post.created_at,
    publishedAt: post.published_at || post.created_at || null,
    categories,
    tags,
    images
  };
}

function normalizeCategoryName(value = "") {
  // Limpia el nombre visible de categoria antes de buscarla en base.
  return String(value).trim();
}

function normalizeTagName(value = "") {
  // Limpia el nombre visible de una etiqueta antes de persistirla.
  return String(value).trim();
}

function normalizeTagSlug(value = "") {
  // Convierte la etiqueta a slug estable para deduplicarla.
  return slugify(value || "");
}

function looksLikeUuid(value = "") {
  // Evita consultar por id cuando el identificador recibido es un slug textual.
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value).trim()
  );
}

function normalizeStringArray(value) {
  // Elimina valores vacios y duplicados en listas de categorias o tags.
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map((item) => String(item || "").trim()).filter(Boolean))];
}

async function resolveCategoryIds(categories = []) {
  // Convierte nombres de categoria elegidos en ids reales de la tabla pivote.
  const normalized = normalizeStringArray(categories);

  if (!normalized.length) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from("illustration_categories")
    .select("id, name, slug");

  if (error) {
    throw new Error(error.message);
  }

  const wanted = new Set(
    normalized.flatMap((category) => [normalizeCategoryName(category), slugify(category)])
  );

  return (data || [])
    .filter((row) => wanted.has(row.name) || wanted.has(row.slug))
    .map((row) => row.id);
}

async function resolveTagIds(tags = []) {
  // Resuelve ids de tags y crea los faltantes para mantener el catalogo vivo.
  const normalized = normalizeStringArray(tags);

  if (!normalized.length) {
    return [];
  }

  const desired = normalized.map((tag) => ({
    name: normalizeTagName(tag),
    slug: normalizeTagSlug(tag)
  }));

  const desiredSlugs = desired.map((tag) => tag.slug).filter(Boolean);

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("illustration_tags")
    .select("id, name, slug")
    .in("slug", desiredSlugs);

  if (existingError) {
    throw new Error(existingError.message);
  }

  const bySlug = new Map((existing || []).map((row) => [row.slug, row]));
  const missing = desired.filter((tag) => tag.slug && !bySlug.has(tag.slug));

  if (missing.length) {
    const { data: created, error: createError } = await supabaseAdmin
      .from("illustration_tags")
      .insert(missing)
      .select("id, name, slug");

    if (createError) {
      throw new Error(createError.message);
    }

    for (const row of created || []) {
      bySlug.set(row.slug, row);
    }
  }

  return desiredSlugs.map((slug) => bySlug.get(slug)?.id).filter(Boolean);
}

async function replacePostCategories(postId, categories = []) {
  // Reescribe por completo la relacion categoria-ilustracion tras cada guardado.
  const categoryIds = await resolveCategoryIds(categories);

  const { error: deleteError } = await supabaseAdmin
    .from("illustration_post_categories")
    .delete()
    .eq("illustration_post_id", postId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (!categoryIds.length) {
    return;
  }

  const payload = categoryIds.map((categoryId) => ({
    illustration_post_id: postId,
    category_id: categoryId
  }));

  const { error: insertError } = await supabaseAdmin
    .from("illustration_post_categories")
    .insert(payload);

  if (insertError) {
    throw new Error(insertError.message);
  }
}

async function replacePostTags(postId, tags = []) {
  // Reescribe por completo la relacion tag-ilustracion tras cada guardado.
  const tagIds = await resolveTagIds(tags);

  const { error: deleteError } = await supabaseAdmin
    .from("illustration_post_tags")
    .delete()
    .eq("illustration_post_id", postId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (!tagIds.length) {
    return;
  }

  const payload = tagIds.map((tagId) => ({
    illustration_post_id: postId,
    tag_id: tagId
  }));

  const { error: insertError } = await supabaseAdmin
    .from("illustration_post_tags")
    .insert(payload);

  if (insertError) {
    throw new Error(insertError.message);
  }
}

async function replacePostImages(postId, images = []) {
  // Sincroniza la galeria completa de la ilustracion con el estado enviado por el panel.
  const normalized = Array.isArray(images)
    ? images
        .map((image, index) => ({
          id: image.id || randomUUID(),
          illustration_post_id: postId,
          storage_path: image.storagePath || "",
          public_url: image.publicUrl || image.url || "",
          alt_text: image.altText || "",
          sort_order: Number(image.sortOrder ?? index)
        }))
        .filter((image) => image.public_url)
    : [];

  const { error: deleteError } = await supabaseAdmin
    .from("illustration_images")
    .delete()
    .eq("illustration_post_id", postId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (!normalized.length) {
    return;
  }

  const { error: insertError } = await supabaseAdmin
    .from("illustration_images")
    .insert(normalized);

  if (insertError) {
    throw new Error(insertError.message);
  }
}

async function attachAuthorProfiles(posts) {
  // Enriquece las ilustraciones con avatar y nombre actual del perfil autor.
  const authorIds = [...new Set(posts.map((post) => post.author_id).filter(Boolean))];

  if (!authorIds.length) {
    return posts;
  }

  const { data: profiles, error } = await supabaseAdmin
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", authorIds);

  if (error) {
    throw new Error(error.message);
  }

  const byId = new Map((profiles || []).map((profile) => [profile.id, profile]));

  return posts.map((post) => ({
    ...post,
    author_name:
      byId.get(post.author_id)?.display_name || post.author_name || "Ilustrador de Valoria",
    author_avatar_url: byId.get(post.author_id)?.avatar_url || ""
  }));
}

async function fetchCategoriesForPosts(postIds) {
  // Carga categorias ya resueltas para cada ilustracion consultada.
  if (!postIds.length) {
    return new Map();
  }

  const { data, error } = await supabaseAdmin
    .from("illustration_post_categories")
    .select("illustration_post_id, illustration_categories(name)")
    .in("illustration_post_id", postIds);

  if (error) {
    throw new Error(error.message);
  }

  const map = new Map();

  for (const row of data || []) {
    const current = map.get(row.illustration_post_id) || [];
    current.push(row.illustration_categories?.name);
    map.set(row.illustration_post_id, current.filter(Boolean));
  }

  return map;
}

async function fetchTagsForPosts(postIds) {
  // Carga las etiquetas visuales asociadas a cada ilustracion.
  if (!postIds.length) {
    return new Map();
  }

  const { data, error } = await supabaseAdmin
    .from("illustration_post_tags")
    .select("illustration_post_id, illustration_tags(name)")
    .in("illustration_post_id", postIds);

  if (error) {
    throw new Error(error.message);
  }

  const map = new Map();

  for (const row of data || []) {
    const current = map.get(row.illustration_post_id) || [];
    current.push(row.illustration_tags?.name);
    map.set(row.illustration_post_id, current.filter(Boolean));
  }

  return map;
}

async function fetchImagesForPosts(postIds) {
  // Recupera la galeria ordenada de imagenes por ilustracion.
  if (!postIds.length) {
    return new Map();
  }

  const { data, error } = await supabaseAdmin
    .from("illustration_images")
    .select("*")
    .in("illustration_post_id", postIds)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const map = new Map();

  for (const row of data || []) {
    const current = map.get(row.illustration_post_id) || [];
    current.push({
      id: row.id,
      publicUrl: row.public_url,
      altText: row.alt_text || "",
      width: row.width || null,
      height: row.height || null,
      sortOrder: Number(row.sort_order || 0)
    });
    map.set(row.illustration_post_id, current);
  }

  return map;
}

async function fetchUserLikedPostIds(postIds, currentUserId) {
  // Determina que ilustraciones ya fueron likeadas por el visitante actual.
  if (!postIds.length || !currentUserId) {
    return new Set();
  }

  const { data, error } = await supabaseAdmin
    .from("illustration_post_likes")
    .select("illustration_post_id")
    .eq("user_id", currentUserId)
    .in("illustration_post_id", postIds);

  if (error) {
    throw new Error(error.message);
  }

  return new Set((data || []).map((row) => row.illustration_post_id));
}

async function fetchIllustrationCommentsInternal(postId, currentUserId = null) {
  // Construye el arbol de comentarios con autores y estado de likes para el detalle visual.
  const { data: comments, error } = await supabaseAdmin
    .from("illustration_comments")
    .select("*")
    .eq("illustration_post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingIllustrationTable(error.message)) {
      return [];
    }
    throw new Error(error.message);
  }

  if (!comments?.length) {
    return [];
  }

  const authorIds = [...new Set(comments.map((comment) => comment.author_id).filter(Boolean))];
  const commentIds = comments.map((comment) => comment.id);

  const [profilesResult, likedCommentsResult] = await Promise.all([
    authorIds.length
      ? supabaseAdmin
          .from("profiles")
          .select("id, display_name, avatar_url")
          .in("id", authorIds)
      : Promise.resolve({ data: [], error: null }),
    currentUserId
      ? supabaseAdmin
          .from("illustration_comment_likes")
          .select("comment_id")
          .eq("user_id", currentUserId)
          .in("comment_id", commentIds)
      : Promise.resolve({ data: [], error: null })
  ]);

  if (profilesResult.error) {
    throw new Error(profilesResult.error.message);
  }

  if (likedCommentsResult.error) {
    throw new Error(likedCommentsResult.error.message);
  }

  const profilesById = new Map(
    (profilesResult.data || []).map((profile) => [profile.id, profile])
  );
  const likedCommentIds = new Set(
    (likedCommentsResult.data || []).map((row) => row.comment_id)
  );

  const byParent = new Map();

  const normalized = comments.map((comment) => {
    const profile = comment.author_id ? profilesById.get(comment.author_id) : null;

    return {
      id: comment.id,
      illustrationPostId: comment.illustration_post_id,
      authorId: comment.author_id,
      authorName:
        profile?.display_name || comment.author_name || "Miembro de la comunidad",
      authorAvatarUrl: profile?.avatar_url || "",
      content: comment.content,
      parentCommentId: comment.parent_comment_id || "",
      likesCount: Number(comment.likes_count || 0),
      likedByCurrentUser: likedCommentIds.has(comment.id),
      createdAt: comment.created_at,
      replies: []
    };
  });

  for (const comment of normalized) {
    const key = comment.parentCommentId || "__root__";
    const bucket = byParent.get(key) || [];
    bucket.push(comment);
    byParent.set(key, bucket);
  }

  function attachReplies(parentId = "__root__") {
    return (byParent.get(parentId) || []).map((comment) => ({
      ...comment,
      replies: attachReplies(comment.id)
    }));
  }

  return attachReplies();
}

async function fetchIllustrationFanartsInternal(postId) {
  // Recupera los fanarts de comunidad ligados a una ilustracion puntual.
  const { data: fanarts, error } = await supabaseAdmin
    .from("illustration_fanarts")
    .select("*")
    .eq("illustration_post_id", postId)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingIllustrationTable(error.message)) {
      return [];
    }
    throw new Error(error.message);
  }

  if (!fanarts?.length) {
    return [];
  }

  const contributorIds = [
    ...new Set(fanarts.map((fanart) => fanart.contributor_id).filter(Boolean))
  ];

  const profilesResult = contributorIds.length
    ? await supabaseAdmin
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", contributorIds)
    : { data: [], error: null };

  if (profilesResult.error) {
    throw new Error(profilesResult.error.message);
  }

  const profilesById = new Map(
    (profilesResult.data || []).map((profile) => [profile.id, profile])
  );

  return fanarts.map((fanart) => {
    const contributor = fanart.contributor_id
      ? profilesById.get(fanart.contributor_id)
      : null;

    return {
      id: fanart.id,
      illustrationPostId: fanart.illustration_post_id,
      title: fanart.title || "Fanart de comunidad",
      publicUrl: fanart.public_url,
      storagePath: fanart.storage_path || "",
      altText: fanart.alt_text || fanart.title || "Fanart de comunidad",
      contributorId: fanart.contributor_id || "",
      contributorName:
        contributor?.display_name ||
        fanart.contributor_name ||
        "Miembro de la comunidad",
      contributorAvatarUrl: contributor?.avatar_url || "",
      createdAt: fanart.created_at
    };
  });
}

export class IllustrationModel {
  static async getCommentById(commentId) {
    // Recupera un comentario puntual para notificar respuestas o likes.
    if (!commentId || !isSupabaseEnabled()) {
      return null;
    }

    const { data, error } = await supabaseAdmin
      .from("illustration_comments")
      .select("*")
      .eq("id", commentId)
      .maybeSingle();

    if (error) {
      if (isMissingIllustrationTable(error.message)) {
        return null;
      }
      throw new Error(error.message);
    }

    return data
      ? {
          id: data.id,
          illustrationPostId: data.illustration_post_id,
          authorId: data.author_id,
          authorName: data.author_name || "Miembro de la comunidad",
          parentCommentId: data.parent_comment_id || "",
          likesCount: Number(data.likes_count || 0)
        }
      : null;
  }

  static async getAll(currentUserId = null) {
    // Lista el catalogo publico de ilustraciones para home, directorios y exploracion.
    if (!isSupabaseEnabled()) {
      return [];
    }

    const { data: posts, error } = await supabaseAdmin
      .from("illustration_posts")
      .select("*")
      .eq("status", "published")
      .eq("visibility", "public")
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      if (isMissingIllustrationTable(error.message)) {
        return [];
      }
      throw new Error(error.message);
    }

    if (!posts?.length) {
      return [];
    }

    const postIds = posts.map((post) => post.id);
    const [withAuthors, imagesByPost, categoriesByPost, tagsByPost, likedPostIds] = await Promise.all([
      attachAuthorProfiles(posts),
      fetchImagesForPosts(postIds),
      fetchCategoriesForPosts(postIds),
      fetchTagsForPosts(postIds),
      fetchUserLikedPostIds(postIds, currentUserId)
    ]);

    return withAuthors.map((post) =>
      mapIllustration(
        post,
        imagesByPost.get(post.id) || [],
        categoriesByPost.get(post.id) || [],
        tagsByPost.get(post.id) || [],
        likedPostIds.has(post.id)
      )
    );
  }

  static async getByIdOrSlug(identifier, currentUserId = null) {
    // Recupera una ilustracion puntual aceptando UUID o slug publico.
    if (!isSupabaseEnabled()) {
      return null;
    }

    let basePost = null;

    if (looksLikeUuid(identifier)) {
      const byId = await supabaseAdmin
        .from("illustration_posts")
        .select("*")
        .eq("id", identifier)
        .maybeSingle();

      if (byId.error && !isMissingIllustrationTable(byId.error.message)) {
        throw new Error(byId.error.message);
      }

      basePost = byId.data || null;
    }

    if (!basePost) {
      const bySlug = await supabaseAdmin
        .from("illustration_posts")
        .select("*")
        .eq("slug", identifier)
        .maybeSingle();

      if (bySlug.error && !isMissingIllustrationTable(bySlug.error.message)) {
        throw new Error(bySlug.error.message);
      }

      basePost = bySlug.data || null;
    }

    if (!basePost) {
      return null;
    }

    const [withAuthors, imagesByPost, categoriesByPost, tagsByPost, likedPostIds] = await Promise.all([
      attachAuthorProfiles([basePost]),
      fetchImagesForPosts([basePost.id]),
      fetchCategoriesForPosts([basePost.id]),
      fetchTagsForPosts([basePost.id]),
      fetchUserLikedPostIds([basePost.id], currentUserId)
    ]);

    const post = withAuthors[0];

    return mapIllustration(
      post,
      imagesByPost.get(post.id) || [],
      categoriesByPost.get(post.id) || [],
      tagsByPost.get(post.id) || [],
      likedPostIds.has(post.id)
    );
  }

  static async getByAuthorId(authorId) {
    // Devuelve el portafolio completo de un autor especifico.
    if (!isSupabaseEnabled()) {
      return [];
    }

    const { data, error } = await supabaseAdmin
      .from("illustration_posts")
      .select("*")
      .eq("author_id", authorId)
      .order("created_at", { ascending: false });

    if (error) {
      if (isMissingIllustrationTable(error.message)) {
        return [];
      }
      throw new Error(error.message);
    }

    if (!data?.length) {
      return [];
    }

    const postIds = data.map((post) => post.id);
    const [withAuthors, imagesByPost, categoriesByPost, tagsByPost] = await Promise.all([
      attachAuthorProfiles(data),
      fetchImagesForPosts(postIds),
      fetchCategoriesForPosts(postIds),
      fetchTagsForPosts(postIds)
    ]);

    return withAuthors.map((post) =>
      mapIllustration(
        post,
        imagesByPost.get(post.id) || [],
        categoriesByPost.get(post.id) || [],
        tagsByPost.get(post.id) || []
      )
    );
  }

  static async create(input) {
    // Crea la ilustracion base y luego sincroniza categorias, tags e imagenes relacionadas.
    if (!isSupabaseEnabled()) {
      return null;
    }

    const normalizedImages = Array.isArray(input.images) ? input.images : [];
    const coverUrl =
      input.coverUrl || normalizedImages[0]?.publicUrl || normalizedImages[0]?.url || "";

    const payload = {
      author_id: input.authorId,
      title: input.title,
      slug: slugify(input.slug || input.title),
      description: input.description || "",
      cover_url: coverUrl,
      status: input.status || "draft",
      visibility: input.visibility || "public",
      is_featured: Boolean(input.isFeatured)
    };

    const { data, error } = await supabaseAdmin
      .from("illustration_posts")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    await Promise.all([
      replacePostCategories(data.id, input.categories || []),
      replacePostTags(data.id, input.tags || []),
      replacePostImages(data.id, normalizedImages)
    ]);

    return this.getByIdOrSlug(data.id);
  }

  static async update(postId, input) {
    // Actualiza la ilustracion y rehace sus relaciones derivadas si cambiaron.
    if (!isSupabaseEnabled()) {
      return null;
    }

    const payload = {};

    if (input.title !== undefined) {
      payload.title = input.title;
    }
    if (input.slug !== undefined) {
      payload.slug = slugify(input.slug || input.title || "");
    }
    if (input.description !== undefined) {
      payload.description = input.description;
    }
    if (input.coverUrl !== undefined) {
      payload.cover_url = input.coverUrl;
    }
    if (input.status !== undefined) {
      payload.status = input.status;
    }
    if (input.visibility !== undefined) {
      payload.visibility = input.visibility;
    }
    if (input.isFeatured !== undefined) {
      payload.is_featured = Boolean(input.isFeatured);
    }

    if (Object.keys(payload).length) {
      const { error } = await supabaseAdmin
        .from("illustration_posts")
        .update(payload)
        .eq("id", postId);

      if (error) {
        throw new Error(error.message);
      }
    }

    if (input.categories !== undefined) {
      await replacePostCategories(postId, input.categories);
    }

    if (input.tags !== undefined) {
      await replacePostTags(postId, input.tags);
    }

    if (input.images !== undefined) {
      await replacePostImages(postId, input.images);
    }

    return this.getByIdOrSlug(postId);
  }

  static async delete(postId) {
    // Elimina una ilustracion del catalogo del autor.
    if (!isSupabaseEnabled()) {
      return;
    }

    const { error } = await supabaseAdmin
      .from("illustration_posts")
      .delete()
      .eq("id", postId);

    if (error) {
      throw new Error(error.message);
    }
  }

  static async getComments(identifier, currentUserId = null) {
    // Devuelve el hilo de comentarios del detalle de una ilustracion.
    if (!isSupabaseEnabled()) {
      return [];
    }

    const illustration = await this.getByIdOrSlug(identifier, currentUserId);

    if (!illustration) {
      return [];
    }

    return fetchIllustrationCommentsInternal(illustration.id, currentUserId);
  }

  static async getFanarts(identifier) {
    // Devuelve las piezas de comunidad creadas como fanarts de una ilustracion.
    if (!isSupabaseEnabled()) {
      return [];
    }

    const illustration = await this.getByIdOrSlug(identifier);

    if (!illustration) {
      return [];
    }

    return fetchIllustrationFanartsInternal(illustration.id);
  }

  static async createComment(identifier, input) {
    // Inserta un comentario nuevo y recalcula el contador visible del post.
    if (!isSupabaseEnabled()) {
      return null;
    }

    const illustration = await this.getByIdOrSlug(identifier, input.authorId);

    if (!illustration) {
      throw new Error("Ilustracion no encontrada");
    }

    const { data, error } = await supabaseAdmin
      .from("illustration_comments")
      .insert({
        illustration_post_id: illustration.id,
        author_id: input.authorId,
        author_name: input.authorName,
        parent_comment_id: input.parentCommentId || null,
        content: input.content
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    await supabaseAdmin
      .from("illustration_posts")
      .update({ comments_count: Number(illustration.commentsCount || 0) + 1 })
      .eq("id", illustration.id);

    const comments = await fetchIllustrationCommentsInternal(
      illustration.id,
      input.authorId
    );

    function findComment(items) {
      for (const item of items) {
        if (item.id === data.id) {
          return item;
        }
        const reply = findComment(item.replies || []);
        if (reply) {
          return reply;
        }
      }
      return null;
    }

    return {
      comment: findComment(comments),
      commentsCount: Number(illustration.commentsCount || 0) + 1
    };
  }

  static async createFanart(identifier, input) {
    // Inserta un fanart de comunidad asociado a una ilustracion publicada.
    if (!isSupabaseEnabled()) {
      return null;
    }

    const illustration = await this.getByIdOrSlug(identifier, input.contributorId);

    if (!illustration) {
      throw new Error("Ilustracion no encontrada");
    }

    const { data, error } = await supabaseAdmin
      .from("illustration_fanarts")
      .insert({
        illustration_post_id: illustration.id,
        title: input.title || "Fanart de comunidad",
        storage_path: input.storagePath || "",
        public_url: input.publicUrl,
        alt_text: input.altText || input.title || "Fanart de comunidad",
        contributor_id: input.contributorId || null,
        contributor_name: input.contributorName || null
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const fanarts = await fetchIllustrationFanartsInternal(illustration.id);
    const fanart = fanarts.find((item) => item.id === data.id) || null;

    return {
      fanart,
      illustration
    };
  }

  static async toggleLike(identifier, userId) {
    // Alterna el like del usuario sobre una ilustracion y devuelve el nuevo contador.
    if (!isSupabaseEnabled()) {
      return { liked: false, likesCount: 0 };
    }

    const illustration = await this.getByIdOrSlug(identifier, userId);

    if (!illustration) {
      throw new Error("Ilustracion no encontrada");
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("illustration_post_likes")
      .select("id")
      .eq("illustration_post_id", illustration.id)
      .eq("user_id", userId)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    let liked = false;
    let likesCount = Number(illustration.likesCount || 0);

    if (existing) {
      const { error: deleteError } = await supabaseAdmin
        .from("illustration_post_likes")
        .delete()
        .eq("id", existing.id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      likesCount = Math.max(0, likesCount - 1);
    } else {
      const { error: insertError } = await supabaseAdmin
        .from("illustration_post_likes")
        .insert({
          illustration_post_id: illustration.id,
          user_id: userId
        });

      if (insertError) {
        throw new Error(insertError.message);
      }

      liked = true;
      likesCount += 1;
    }

    const { error: updateError } = await supabaseAdmin
      .from("illustration_posts")
      .update({ likes_count: likesCount })
      .eq("id", illustration.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return { liked, likesCount };
  }

  static async toggleCommentLike(identifier, commentId, userId) {
    // Alterna el like del usuario sobre un comentario de ilustracion.
    if (!isSupabaseEnabled()) {
      return { liked: false, likesCount: 0 };
    }

    const illustration = await this.getByIdOrSlug(identifier, userId);

    if (!illustration) {
      throw new Error("Ilustracion no encontrada");
    }

    const { data: comment, error: commentError } = await supabaseAdmin
      .from("illustration_comments")
      .select("id, illustration_post_id, likes_count, author_id")
      .eq("id", commentId)
      .maybeSingle();

    if (commentError) {
      throw new Error(commentError.message);
    }

    if (!comment || comment.illustration_post_id !== illustration.id) {
      throw new Error("Comentario no encontrado");
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("illustration_comment_likes")
      .select("id")
      .eq("comment_id", commentId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    let liked = false;
    let likesCount = Number(comment.likes_count || 0);

    if (existing) {
      const { error: deleteError } = await supabaseAdmin
        .from("illustration_comment_likes")
        .delete()
        .eq("id", existing.id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      likesCount = Math.max(0, likesCount - 1);
    } else {
      const { error: insertError } = await supabaseAdmin
        .from("illustration_comment_likes")
        .insert({
          comment_id: commentId,
          user_id: userId
        });

      if (insertError) {
        throw new Error(insertError.message);
      }

      liked = true;
      likesCount += 1;
    }

    const { error: updateError } = await supabaseAdmin
      .from("illustration_comments")
      .update({ likes_count: likesCount })
      .eq("id", commentId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return { liked, likesCount, authorId: comment.author_id || "" };
  }
}
