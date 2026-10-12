// Modelo de historias.
// Es la fuente principal de lectura y escritura de historias del sistema.
import { randomUUID } from "node:crypto";
import {
  demoChapterImages,
  demoChapters,
  demoReviewLikes,
  demoStories,
  demoStoryReviews
} from "../data/demoStore.js";
import { isSupabaseEnabled, supabaseAdmin } from "../config/supabase.js";
import { slugify } from "../utils/slugify.js";

function mapStory(story) {
  // Adapta el registro crudo de historia al formato usado por la interfaz.
  return {
    ...story,
    characters: Array.isArray(story.characters) ? story.characters : [],
    tags: Array.isArray(story.tags) ? story.tags : [],
    authorId: story.author_id,
    authorAvatarUrl: story.author_avatar_url || "",
    reads: story.reads_count
      ? Intl.NumberFormat("es-CL", {
          notation: "compact",
          maximumFractionDigits: 1
        }).format(story.reads_count)
      : "0",
    ratingAverage: Number(story.rating_average || 0),
    ratingCount: Number(story.rating_count || 0),
    cover: story.cover_url,
    author: story.author_name
  };
}

function isUuid(value) {
  // Distingue identificadores UUID de slugs publicos.
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function normalizeAuthorKey(value = "") {
  // Normaliza nombres de autor para comparar identidades antiguas por texto.
  return String(value).trim().toLowerCase().replace(/\s+/g, " ");
}

function writeError(error) {
  if (["PGRST204", "42703"].includes(error.code) && /characters|tags/.test(error.message || "")) {
    return new Error("Falta aplicar en Supabase la migración 20261002_story_search_metadata.sql para guardar personajes y etiquetas.");
  }
  return new Error(error.message);
}

async function attachAuthorProfiles(stories) {
  // Enriquece historias con el avatar actual del autor desde profiles.
  if (stories.length === 0) {
    return [];
  }

  const authorIds = [...new Set(stories.map((story) => story.author_id).filter(Boolean))];

  if (!isSupabaseEnabled() || authorIds.length === 0) {
    return stories;
  }

  const { data: profiles, error } = await supabaseAdmin
    .from("profiles")
    .select("id, avatar_url")
    .in("id", authorIds);

  if (error) {
    throw new Error(error.message);
  }

  const byId = new Map((profiles || []).map((profile) => [profile.id, profile]));

  return stories.map((story) => ({
    ...story,
    author_avatar_url: byId.get(story.author_id)?.avatar_url || ""
  }));
}

export class StoryModel {
  static async getAll({ featuredOnly = false } = {}) {
    // Lista historias publicas, con opcion de limitar a destacadas.
    if (!isSupabaseEnabled()) {
      const source = featuredOnly
        ? demoStories.filter((story) => story.is_featured && story.status === "published")
        : demoStories.filter((story) => story.status === "published");
      return source.filter(story=>!story.deleted_at && !story.moderation_hidden_at).map(mapStory);
    }

    let query = supabaseAdmin
      .from("stories")
      .select("*").is("deleted_at", null)
      .eq("status", "published").is("moderation_hidden_at", null)
      .order("created_at", { ascending: false });

    if (featuredOnly) {
      query = query.eq("is_featured", true);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return (await attachAuthorProfiles(data)).map(mapStory);
  }

  static async getByAuthorId(authorId) {
    // Devuelve todas las historias asociadas a un autor por id.
    if (!isSupabaseEnabled()) {
      return demoStories
        .filter((story) => story.author_id === authorId && !story.deleted_at)
        .map(mapStory);
    }

    const { data, error } = await supabaseAdmin
      .from("stories")
      .select("*").is("deleted_at", null)
      .eq("author_id", authorId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (await attachAuthorProfiles(data)).map(mapStory);
  }

  static async getByAuthorIdentity(authorId, authorName = "") {
    // Resuelve historias de un creador usando id y, como respaldo, nombre historico.
    const byId = await this.getByAuthorId(authorId);

    if (byId.length > 0 || !authorName) {
      return byId;
    }

    if (!isSupabaseEnabled()) {
      return demoStories
        .filter(
          (story) =>
            !story.deleted_at && String(story.author_name || "").toLowerCase() ===
            String(authorName).toLowerCase()
        )
        .map(mapStory);
    }

    const { data, error } = await supabaseAdmin
      .from("stories")
      .select("*").is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const normalizedName = normalizeAuthorKey(authorName);

    return (await attachAuthorProfiles(data))
      .filter((story) => normalizeAuthorKey(story.author_name) === normalizedName)
      .map(mapStory);
  }

  static async getByIdOrSlug(identifier) {
    // Recupera una historia puntual usando UUID o slug publico.
    if (!isSupabaseEnabled()) {
      const story = demoStories.find(
        (item) => !item.deleted_at && (item.id === identifier || item.slug === identifier)
      );
      return story ? mapStory(story) : null;
    }

    if (isUuid(identifier)) {
      const byId = await supabaseAdmin
        .from("stories")
        .select("*").is("deleted_at", null)
        .eq("id", identifier)
        .maybeSingle();

      if (byId.error) {
        throw new Error(byId.error.message);
      }

      if (byId.data) {
        return mapStory((await attachAuthorProfiles([byId.data]))[0]);
      }
    }

    const bySlug = await supabaseAdmin
      .from("stories")
      .select("*").is("deleted_at", null)
      .eq("slug", identifier)
      .maybeSingle();

    if (bySlug.error) {
      throw new Error(bySlug.error.message);
    }

    return bySlug.data ? mapStory((await attachAuthorProfiles([bySlug.data]))[0]) : null;
  }

  static async create(input) {
    // Crea una historia nueva y la deja lista para el panel del creador.
    const payload = {
      author_id: input.authorId,
      title: input.title,
      slug: input.slug ? slugify(input.slug) : `${slugify(input.title)}-${randomUUID().slice(0,8)}`,
      description: input.description,
      excerpt: input.excerpt || input.description,
      category: input.category,
      author_name: input.authorName,
      cover_url: input.coverUrl || "",
      status: input.status || "draft",
      is_featured: Boolean(input.isFeatured),
      audience: input.audience || "General",
      language: input.language || "Espanol",
      rights: input.rights || "Todos los derechos reservados",
      mature: Boolean(input.mature)
    };
    for (const key of ["characters", "tags"]) {
      const values = [...new Set((Array.isArray(input[key]) ? input[key] : []).filter((value) => typeof value === "string").map((value) => value.trim()).filter(Boolean))];
      if (values.length) payload[key] = values;
    }

    if (!isSupabaseEnabled()) {
      const story = {
        id: randomUUID(),
        reads_count: 0,
        rating_average: 0,
        rating_count: 0,
        created_at: new Date().toISOString(),
        ...payload
      };
      demoStories.unshift(story);
      return mapStory(story);
    }

    const { data, error } = await supabaseAdmin
      .from("stories")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      throw writeError(error);
    }

    return mapStory((await attachAuthorProfiles([data]))[0]);
  }

  static async registerRead(storyId) {
    // Incrementa lecturas publicas cada vez que un lector abre la historia.
    if (!isSupabaseEnabled()) {
      const story = demoStories.find((item) => item.id === storyId);

      if (!story) {
        return null;
      }

      story.reads_count = Number(story.reads_count || 0) + 1;
      return mapStory(story);
    }

    const { data, error } = await supabaseAdmin.rpc("increment_story_read", { story: storyId });

    if (error) {
      throw new Error(error.message);
    }

    return mapStory((await attachAuthorProfiles([data]))[0]);
  }

  static async update(storyId, input) {
    // Actualiza metadata editorial de la historia.
    if (!isSupabaseEnabled()) {
      const story = demoStories.find((item) => item.id === storyId);

      if (!story) {
        throw new Error("Historia no encontrada");
      }

      for (const key of ["audience", "language", "rights", "mature"]) if(input[key] !== undefined) story[key] = input[key];
      if(input.coverUrl !== undefined) story.cover_url = input.coverUrl;
      if(input.isComplete !== undefined)story.is_complete=Boolean(input.isComplete);
      if (input.title !== undefined) {
        story.title = input.title;
      }
      if (input.description !== undefined) {
        story.description = input.description;
      }
      if (input.excerpt !== undefined) {
        story.excerpt = input.excerpt;
      }
      if (input.category !== undefined) {
        story.category = input.category;
      }
      if (input.status !== undefined) {
        story.status = input.status;
      }

      for (const key of ["characters", "tags"]) {
        if (input[key] !== undefined) story[key] = [...new Set((Array.isArray(input[key]) ? input[key] : []).filter((value) => typeof value === "string").map((value) => value.trim()).filter(Boolean))];
      }

      return mapStory(story);
    }

    const payload = {};
    if(input.isComplete !== undefined)payload.is_complete=Boolean(input.isComplete);
    for (const key of ["audience", "language", "rights", "mature"]) if(input[key] !== undefined) payload[key] = input[key];
    if(input.coverUrl !== undefined) payload.cover_url = input.coverUrl;

    for (const key of ["characters", "tags"]) {
      if (input[key] !== undefined) payload[key] = [...new Set((Array.isArray(input[key]) ? input[key] : []).filter((value) => typeof value === "string").map((value) => value.trim()).filter(Boolean))];
    }

    if (input.title !== undefined) {
      payload.title = input.title;
    }
    if (input.description !== undefined) {
      payload.description = input.description;
    }
    if (input.excerpt !== undefined) {
      payload.excerpt = input.excerpt;
    }
    if (input.category !== undefined) {
      payload.category = input.category;
    }
    if (input.status !== undefined) {
      payload.status = input.status;
    }

    const { data, error } = await supabaseAdmin
      .from("stories")
      .update(payload)
      .eq("id", storyId)
      .select("*")
      .single();

    if (error) {
      throw writeError(error);
    }

    return mapStory((await attachAuthorProfiles([data]))[0]);
  }

  static async delete(storyId) {
    // Elimina una historia y su arbol derivado en modo demo o Supabase.
    if (!isSupabaseEnabled()) {
      const storyIndex = demoStories.findIndex((item) => item.id === storyId);

      if (storyIndex === -1) {
        throw new Error("Historia no encontrada");
      }

      const chapterIds = demoChapters
        .filter((chapter) => chapter.story_id === storyId)
        .map((chapter) => chapter.id);
      const reviewIds = demoStoryReviews
        .filter((review) => review.story_id === storyId)
        .map((review) => review.id);

      demoStories.splice(storyIndex, 1);

      for (let index = demoChapters.length - 1; index >= 0; index -= 1) {
        if (demoChapters[index].story_id === storyId) {
          demoChapters.splice(index, 1);
        }
      }

      for (let index = demoChapterImages.length - 1; index >= 0; index -= 1) {
        if (chapterIds.includes(demoChapterImages[index].chapter_id)) {
          demoChapterImages.splice(index, 1);
        }
      }

      for (let index = demoStoryReviews.length - 1; index >= 0; index -= 1) {
        if (demoStoryReviews[index].story_id === storyId) {
          demoStoryReviews.splice(index, 1);
        }
      }

      for (let index = demoReviewLikes.length - 1; index >= 0; index -= 1) {
        if (reviewIds.includes(demoReviewLikes[index].review_id)) {
          demoReviewLikes.splice(index, 1);
        }
      }
      return;
    }

    const { error } = await supabaseAdmin.from("stories").delete().eq("id", storyId);

    if (error) {
      throw new Error(error.message);
    }
  }
}
