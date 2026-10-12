import { httpError } from '../utils/contentAccess.js';
// Modelo de reseñas.
// Guarda opiniones, recalcula puntuacion media y devuelve reviews por historia.
import { randomUUID } from "node:crypto";
import {
  demoReviewLikes,
  demoStories,
  demoStoryReviews
} from "../data/demoStore.js";
import { isSupabaseEnabled, supabaseAdmin } from "../config/supabase.js";

function mapReview(review) {
  // Adapta una reseña cruda al formato que espera el cliente.
  return {
    ...review,
    reviewerName: review.reviewer_name,
    parentReviewId: review.parent_review_id || null,
    likesCount: review.likes_count || 0,
    likedByCurrentUser: Boolean(review.liked_by_current_user)
  };
}

function isMissingLikesTableError(message = "") {
  // Detecta instalaciones donde aun no existe la tabla de likes de reseñas.
  return message.includes("story_review_likes");
}

function buildReviewTree(reviews) {
  // Convierte una lista plana de reseñas y replies en un arbol legible por la UI.
  const mapped = reviews.map((review) => ({
    ...mapReview(review),
    replies: []
  }));
  const byId = new Map(mapped.map((review) => [review.id, review]));
  const roots = [];

  mapped.forEach((review) => {
    if (review.parentReviewId && byId.has(review.parentReviewId)) {
      byId.get(review.parentReviewId).replies.push(review);
      return;
    }

    roots.push(review);
  });

  roots.forEach((review) => {
    review.replies.sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );
  });

  return roots;
}

function recalculateStoryRating(storyId) {
  // Recalcula rating agregado de la historia en modo demo/local.
  const story = demoStories.find((item) => item.id === storyId);

  if (!story) {
    return;
  }

  const reviews = demoStoryReviews.filter((review) => review.story_id === storyId);
  const ratingReviews = reviews.filter((review) => review.parent_review_id == null);
  const count = ratingReviews.length;
  const average = count
    ? ratingReviews.reduce((sum, review) => sum + review.rating, 0) / count
    : 0;

  story.rating_count = count;
  story.rating_average = Number(average.toFixed(1));
}

async function updateSupabaseStoryRating(storyId) {
  // Recalcula rating agregado de la historia en Supabase tras cambios de reseñas.
  const { data, error } = await supabaseAdmin
    .from("story_reviews")
    .select("rating")
    .eq("story_id", storyId);

  if (error) {
    throw new Error(error.message);
  }

  const ratingReviews = data.filter((review) => review.rating != null);
  const count = ratingReviews.length;
  const average = count
    ? ratingReviews.reduce((sum, review) => sum + review.rating, 0) / count
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

export class ReviewModel {
  static async getById(reviewId) {
    // Recupera una reseña puntual para responder o notificar interacciones.
    if (!reviewId) {
      return null;
    }

    if (!isSupabaseEnabled()) {
      const review = demoStoryReviews.find((item) => item.id === reviewId);
      return review ? mapReview(review) : null;
    }

    const { data, error } = await supabaseAdmin
      .from("story_reviews")
      .select("*")
      .eq("id", reviewId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data ? mapReview(data) : null;
  }

  static async getByStoryId(storyId, currentUserId = null, chapterId = null) {
    // Lista reseñas de una historia y filtra por capitulo si se solicita.
    if (!isSupabaseEnabled()) {
      const reviews = demoStoryReviews
        .filter((review) => review.story_id === storyId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .map((review) => ({
          ...review,
          liked_by_current_user: currentUserId
            ? demoReviewLikes.some(
                (like) =>
                  like.review_id === review.id && like.user_id === currentUserId
              )
            : false
        }));
      const reviewTree = buildReviewTree(reviews);
      return chapterId
        ? reviewTree.filter((review) => review.chapter_id === chapterId)
        : reviewTree;
    }

    const { data, error } = await supabaseAdmin
      .from("story_reviews")
      .select("*")
      .eq("story_id", storyId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    let likedReviewIds = new Set();

    if (currentUserId) {
      const { data: likes, error: likesError } = await supabaseAdmin
        .from("story_review_likes")
        .select("review_id")
        .eq("user_id", currentUserId)
        .in(
          "review_id",
          data.map((review) => review.id)
        );

      if (likesError && !isMissingLikesTableError(likesError.message)) {
        throw new Error(likesError.message);
      }

      likedReviewIds = new Set((likes || []).map((like) => like.review_id));
    }

    const enriched = data.map((review) => ({
      ...review,
      liked_by_current_user: likedReviewIds.has(review.id)
    }));

    const reviewTree = buildReviewTree(enriched);
    return chapterId
      ? reviewTree.filter((review) => review.chapter_id === chapterId)
      : reviewTree;
  }

  static async create(storyId, input) {
    // Crea una reseña principal y actualiza el promedio general de la historia.
    const payload = {
      story_id: storyId,
      chapter_id: input.chapterId || null,
      reviewer_id: input.reviewerId || null,
      reviewer_name: input.reviewerName,
      rating: Number(input.rating),
      review_text: input.reviewText
    };

    if (!isSupabaseEnabled()) {
      const review = {
        id: randomUUID(),
        created_at: new Date().toISOString(),
        ...payload
      };
      demoStoryReviews.unshift(review);
      recalculateStoryRating(storyId);
      return mapReview(review);
    }

    const { data, error } = await supabaseAdmin
      .from("story_reviews")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    await updateSupabaseStoryRating(storyId);
    return mapReview(data);
  }

  static async createReply(storyId, reviewId, input) {
    // Inserta una respuesta dentro del hilo de una reseña existente.
    const payload = {
      story_id: storyId,
      parent_review_id: reviewId,
      chapter_id: input.chapterId || null,
      reviewer_id: input.reviewerId || null,
      reviewer_name: input.reviewerName,
      rating: null,
      review_text: input.reviewText
    };

    if (!isSupabaseEnabled()) {
      const reply = {
        id: randomUUID(),
        likes_count: 0,
        created_at: new Date().toISOString(),
        ...payload
      };
      demoStoryReviews.unshift(reply);
      return mapReview(reply);
    }

    const { data, error } = await supabaseAdmin
      .from("story_reviews")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapReview(data);
  }

  static async like(reviewId, userId) {
    // Registra una sola reacción por usuario en una reseña o respuesta.
    if (!userId) {
      throw new Error("Debes iniciar sesion para reaccionar a una reseña");
    }

    if (!isSupabaseEnabled()) {
      const review = demoStoryReviews.find((item) => item.id === reviewId);

      if (!review) {
        throw new Error("Reseña no encontrada");
      }

      const alreadyLiked = demoReviewLikes.some(
        (like) => like.review_id === reviewId && like.user_id === userId
      );

      if (alreadyLiked) {
        return {
          review: mapReview({
            ...review,
            liked_by_current_user: true
          }),
          alreadyLiked: true
        };
      }

      demoReviewLikes.push({
        id: randomUUID(),
        review_id: reviewId,
        user_id: userId,
        created_at: new Date().toISOString()
      });
      review.likes_count = (review.likes_count || 0) + 1;
      return {
        review: mapReview({
          ...review,
          liked_by_current_user: true
        }),
        alreadyLiked: false
      };
    }

    const {data,error}=await supabaseAdmin.rpc('like_story_review',{p_review_id:reviewId,p_user_id:userId});
    if(error){
      if(['PGRST202','PGRST205','42P01','42883'].includes(error.code))throw httpError(503,'Aplica la migración de likes de reseñas en Supabase.');
      if(error.code==='P0002')throw httpError(404,'Reseña no disponible.');
      throw error;
    }
    if(!data?.review)throw new Error('No se pudo confirmar el registro del like.');
    return {review:mapReview({...data.review,liked_by_current_user:true}),alreadyLiked:data.alreadyLiked===true};
  }
}
