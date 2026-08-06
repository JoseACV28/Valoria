// Modelo de capitulos.
// Administra consulta y persistencia de capitulos asociados a una historia.
import { randomUUID } from "node:crypto";
import {
  demoChapterImages,
  demoChapters,
  demoReviewLikes,
  demoStoryReviews,
  demoStories
} from "../data/demoStore.js";
import { isSupabaseEnabled, supabaseAdmin } from "../config/supabase.js";
import { slugify } from "../utils/slugify.js";

function mapChapter(chapter, chapterImages = []) {
  // Normaliza un capitulo con su galeria asociada para la UI de lectura o edicion.
  return {
    ...chapter,
    chapter_images: chapterImages
  };
}

function recalculateDemoStoryRating(storyId) {
  // Recalcula rating agregado de la historia en modo demo/local.
  const story = demoStories.find((item) => item.id === storyId);

  if (!story) {
    return;
  }

  const reviews = demoStoryReviews.filter(
    (review) => review.story_id === storyId && review.parent_review_id == null
  );
  const count = reviews.length;
  const average = count
    ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / count
    : 0;

  story.rating_count = count;
  story.rating_average = Number(average.toFixed(1));
}

async function recalculateSupabaseStoryRating(storyId) {
  // Recalcula rating agregado de la historia en Supabase tras borrar capitulos o reseñas.
  const { data, error } = await supabaseAdmin
    .from("story_reviews")
    .select("rating")
    .eq("story_id", storyId)
    .is("parent_review_id", null);

  if (error) {
    throw new Error(error.message);
  }

  const ratingReviews = data.filter((review) => review.rating != null);
  const count = ratingReviews.length;
  const average = count
    ? ratingReviews.reduce((sum, review) => sum + Number(review.rating), 0) / count
    : 0;

  const { error: updateError } = await supabaseAdmin
    .from("stories")
    .update({
      rating_count: count,
      rating_average: Number(average.toFixed(1))
    })
    .eq("id", storyId);

  if (updateError) {
    throw new Error(updateError.message);
  }
}

export class ChapterModel {
  static async getByStoryId(storyId) {
    // Lista capitulos de una historia, ordenados para lectura y panel.
    if (!isSupabaseEnabled()) {
      return demoChapters
        .filter((chapter) => chapter.story_id === storyId)
        .sort((a, b) => a.chapter_number - b.chapter_number);
    }

    const { data, error } = await supabaseAdmin
      .from("chapters")
      .select("*, chapter_images(*)")
      .eq("story_id", storyId)
      .order("chapter_number", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  static async create(storyId, input) {
    // Crea un capitulo nuevo y sus imagenes iniciales si fueron enviadas.
    const payload = {
      story_id: storyId,
      title: input.title,
      slug: slugify(input.slug || input.title),
      chapter_number: Number(input.chapterNumber),
      excerpt: input.excerpt || "",
      content: input.content || "",
      published_at:
        input.status === "published" ? new Date().toISOString() : null,
      status: input.status || "draft"
    };

    if (!isSupabaseEnabled()) {
      const chapter = {
        id: randomUUID(),
        created_at: new Date().toISOString(),
        ...payload
      };
      demoChapters.push(chapter);

      if (Array.isArray(input.images)) {
        input.images.forEach((image, index) => {
          demoChapterImages.push({
            id: randomUUID(),
            chapter_id: chapter.id,
            storage_path: image.storagePath,
            public_url: image.publicUrl,
            alt_text: image.altText || chapter.title,
            image_role: image.imageRole || "creator",
            contributor_id: image.contributorId || null,
            contributor_name: image.contributorName || null,
            sort_order: index
          });
        });
      }

      return mapChapter(
        chapter,
        demoChapterImages.filter((image) => image.chapter_id === chapter.id)
      );
    }

    const { data: chapter, error: chapterError } = await supabaseAdmin
      .from("chapters")
      .insert(payload)
      .select("*")
      .single();

    if (chapterError) {
      throw new Error(chapterError.message);
    }

    let chapterImages = [];

    if (Array.isArray(input.images) && input.images.length > 0) {
      const imageRows = input.images.map((image, index) => ({
        chapter_id: chapter.id,
        storage_path: image.storagePath,
        public_url: image.publicUrl,
        alt_text: image.altText || chapter.title,
        image_role: image.imageRole || "creator",
        contributor_id: image.contributorId || null,
        contributor_name: image.contributorName || null,
        sort_order: index
      }));

      const { data, error } = await supabaseAdmin
        .from("chapter_images")
        .insert(imageRows)
        .select("*");

      if (error) {
        throw new Error(error.message);
      }

      chapterImages = data;
    }

    return mapChapter(chapter, chapterImages);
  }

  static async addIllustration(storyId, chapterId, input) {
    // Inserta una ilustracion extra en el capitulo desde creador o comunidad.
    const imagePayload = {
      chapter_id: chapterId,
      storage_path: input.storagePath,
      public_url: input.publicUrl,
      alt_text: input.altText || "Ilustracion del capitulo",
      image_role: input.imageRole || "community",
      contributor_id: input.contributorId || null,
      contributor_name: input.contributorName || null,
      sort_order: Number(input.sortOrder || 0)
    };

    if (!isSupabaseEnabled()) {
      const image = {
        id: randomUUID(),
        created_at: new Date().toISOString(),
        ...imagePayload
      };
      demoChapterImages.push(image);
      return image;
    }

    const chapterLookup = await supabaseAdmin
      .from("chapters")
      .select("id, story_id")
      .eq("id", chapterId)
      .eq("story_id", storyId)
      .maybeSingle();

    if (chapterLookup.error) {
      throw new Error(chapterLookup.error.message);
    }

    if (!chapterLookup.data) {
      throw new Error("Capitulo no encontrado");
    }

    const { data, error } = await supabaseAdmin
      .from("chapter_images")
      .insert(imagePayload)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  static async update(storyId, chapterId, input) {
    // Actualiza el capitulo y agrega nuevas imagenes si llegaron en el formulario.
    const payload = {
      title: input.title,
      slug: slugify(input.slug || input.title),
      chapter_number: Number(input.chapterNumber),
      excerpt: input.excerpt || "",
      content: input.content || "",
      status: input.status || "draft",
      published_at:
        input.status === "published"
          ? input.publishedAt || new Date().toISOString()
          : null
    };

    if (!isSupabaseEnabled()) {
      const chapter = demoChapters.find(
        (item) => item.id === chapterId && item.story_id === storyId
      );

      if (!chapter) {
        throw new Error("Capitulo no encontrado");
      }

      Object.assign(chapter, payload);

      if (Array.isArray(input.images) && input.images.length > 0) {
        input.images.forEach((image, index) => {
          demoChapterImages.push({
            id: randomUUID(),
            chapter_id: chapter.id,
            storage_path: image.storagePath,
            public_url: image.publicUrl,
            alt_text: image.altText || chapter.title,
            image_role: image.imageRole || "creator",
            contributor_id: image.contributorId || null,
            contributor_name: image.contributorName || null,
            sort_order: demoChapterImages.filter(
              (currentImage) => currentImage.chapter_id === chapter.id
            ).length + index
          });
        });
      }

      return mapChapter(
        chapter,
        demoChapterImages.filter((image) => image.chapter_id === chapter.id)
      );
    }

    const { data: chapter, error: chapterError } = await supabaseAdmin
      .from("chapters")
      .update(payload)
      .eq("id", chapterId)
      .eq("story_id", storyId)
      .select("*")
      .single();

    if (chapterError) {
      throw new Error(chapterError.message);
    }

    if (Array.isArray(input.images) && input.images.length > 0) {
      const existingImages = await supabaseAdmin
        .from("chapter_images")
        .select("id")
        .eq("chapter_id", chapterId);

      if (existingImages.error) {
        throw new Error(existingImages.error.message);
      }

      const baseSortOrder = existingImages.data.length;
      const imageRows = input.images.map((image, index) => ({
        chapter_id: chapter.id,
        storage_path: image.storagePath,
        public_url: image.publicUrl,
        alt_text: image.altText || chapter.title,
        image_role: image.imageRole || "creator",
        contributor_id: image.contributorId || null,
        contributor_name: image.contributorName || null,
        sort_order: baseSortOrder + index
      }));

      const { error: imageError } = await supabaseAdmin
        .from("chapter_images")
        .insert(imageRows);

      if (imageError) {
        throw new Error(imageError.message);
      }
    }

    const { data: images, error: imagesError } = await supabaseAdmin
      .from("chapter_images")
      .select("*")
      .eq("chapter_id", chapter.id)
      .order("sort_order", { ascending: true });

    if (imagesError) {
      throw new Error(imagesError.message);
    }

    return mapChapter(chapter, images);
  }

  static async delete(storyId, chapterId) {
    // Elimina el capitulo y limpia reseñas, likes e imagenes relacionadas.
    if (!isSupabaseEnabled()) {
      const chapterIndex = demoChapters.findIndex(
        (item) => item.id === chapterId && item.story_id === storyId
      );

      if (chapterIndex === -1) {
        throw new Error("Capitulo no encontrado");
      }

      demoChapters.splice(chapterIndex, 1);

      for (let index = demoChapterImages.length - 1; index >= 0; index -= 1) {
        if (demoChapterImages[index].chapter_id === chapterId) {
          demoChapterImages.splice(index, 1);
        }
      }

      const reviewIdsToDelete = demoStoryReviews
        .filter((review) => review.chapter_id === chapterId)
        .map((review) => review.id);

      for (let index = demoStoryReviews.length - 1; index >= 0; index -= 1) {
        const review = demoStoryReviews[index];
        if (
          review.chapter_id === chapterId ||
          reviewIdsToDelete.includes(review.parent_review_id)
        ) {
          demoStoryReviews.splice(index, 1);
        }
      }

      for (let index = demoReviewLikes.length - 1; index >= 0; index -= 1) {
        if (reviewIdsToDelete.includes(demoReviewLikes[index].review_id)) {
          demoReviewLikes.splice(index, 1);
        }
      }

      recalculateDemoStoryRating(storyId);
      return;
    }

    const { error: reviewsError } = await supabaseAdmin
      .from("story_reviews")
      .delete()
      .eq("story_id", storyId)
      .eq("chapter_id", chapterId);

    if (reviewsError) {
      throw new Error(reviewsError.message);
    }

    const { error } = await supabaseAdmin
      .from("chapters")
      .delete()
      .eq("id", chapterId)
      .eq("story_id", storyId);

    if (error) {
      throw new Error(error.message);
    }

    await recalculateSupabaseStoryRating(storyId);
  }
}
