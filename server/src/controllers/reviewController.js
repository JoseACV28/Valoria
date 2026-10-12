import { profilesBlocked, blockedProfileIds } from '../middlewares/profileBlocks.js';
// Controlador HTTP de reseñas de lectores y puntuaciones.
import { ReviewModel } from "../models/reviewModel.js";
import { StoryModel } from "../models/storyModel.js";
import { NotificationModel } from "../models/notificationModel.js";
import { ChapterModel } from "../models/chapterModel.js";
import { canReadContent, httpError } from "../utils/contentAccess.js";

async function readableChapter(story, chapterId, user) {
  if (!chapterId) return;
  const chapters = await ChapterModel.getByStoryId(story.id, {
    publishedOnly: story.authorId !== user?.id
  });
  if (!chapters.some((chapter) => chapter.id === chapterId)) {
    throw httpError(404, "Capitulo no encontrado");
  }
}

async function readableReview(story, reviewId, user) {
  const review = await ReviewModel.getById(reviewId);
  if (!review || review.story_id !== story.id) {
    throw httpError(404, "Reseña no encontrada");
  }
  if(await profilesBlocked(user?.id,review.reviewer_id))throw httpError(403,'Esta interacción no está disponible entre estas cuentas.');
  await readableChapter(story, review.chapter_id, user);
  return review;
}

export async function getStoryReviews(request, response, next) {
  // Devuelve las reseñas del capitulo activo con replies y estado de like.
  try {
    const story = await StoryModel.getByIdOrSlug(request.params.storyId);

    if (!canReadContent(story, request.authUser)) {
      return response.status(404).json({
        message: "Historia no encontrada"
      });
    }

    await readableChapter(story, request.query.chapterId, request.authUser);
    let reviews = await ReviewModel.getByStoryId(
      story.id,
      request.authUser?.id || null,
      request.query.chapterId || null
    );
    if (story.authorId !== request.authUser?.id && !request.query.chapterId) {
      const publishedChapters = await ChapterModel.getByStoryId(story.id, { publishedOnly: true });
      const publishedIds = new Set(publishedChapters.map((chapter) => chapter.id));
      const filterVisible = (items) => items
        .filter((review) => !review.chapter_id || publishedIds.has(review.chapter_id))
        .map((review) => ({ ...review, replies: filterVisible(review.replies || []) }));
      reviews = filterVisible(reviews);
    }
    const blocked=await blockedProfileIds(request.authUser?.id);
    const filterBlocked=items=>items.filter(item=>!blocked.has(item.reviewer_id||item.reviewerId)).map(item=>({...item,replies:filterBlocked(item.replies||[])}));
    return response.json({ reviews:filterBlocked(reviews) });
  } catch (error) {
    return next(error);
  }
}

export async function createStoryReview(request, response, next) {
  // Publica una reseña principal sobre una historia o capitulo.
  try {
    const story = await StoryModel.getByIdOrSlug(request.params.storyId);

    if (!canReadContent(story, request.authUser)) {
      return response.status(404).json({
        message: "Historia no encontrada"
      });
    }

    if(await profilesBlocked(request.authUser?.id,story.authorId))throw httpError(403,'Esta interacción no está disponible entre estas cuentas.');
    const { rating, reviewText } = request.body;

    if (!rating || !reviewText) {
      return response.status(400).json({
        message: "rating y reviewText son obligatorios"
      });
    }

    if (!Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) {
      return response.status(400).json({
        message: "La puntuacion debe estar entre 1 y 5"
      });
    }

    await readableChapter(story, request.body.chapterId, request.authUser);
    const review = await ReviewModel.create(story.id, {
      ...request.body,
      reviewerId: request.authUser?.id || null,
      reviewerName: request.authUser?.displayName || request.body.reviewerName
    });

    await NotificationModel.create({
      recipientId: story.authorId,
      actorId: request.authUser?.id || null,
      actorName: request.authUser?.displayName || request.body.reviewerName,
      type: "story_review",
      title: `${request.authUser?.displayName || request.body.reviewerName} dejo una reseña en ${story.title}`,
      body: reviewText,
      routeView: "reading",
      routeIdentifier: story.slug || story.id
    });

    return response.status(201).json({ review });
  } catch (error) {
    return next(error);
  }
}

export async function createStoryReviewReply(request, response, next) {
  // Publica una respuesta dentro de un hilo de reseñas.
  try {
    const story = await StoryModel.getByIdOrSlug(request.params.storyId);

    if (!canReadContent(story, request.authUser)) {
      return response.status(404).json({
        message: "Historia no encontrada"
      });
    }

    if(await profilesBlocked(request.authUser?.id,story.authorId))throw httpError(403,'Esta interacción no está disponible entre estas cuentas.');
    const { reviewText } = request.body;

    if (!reviewText) {
      return response.status(400).json({
        message: "reviewText es obligatorio"
      });
    }

    const parentReview = await readableReview(story, request.params.reviewId, request.authUser);

    const review = await ReviewModel.createReply(
      story.id,
      request.params.reviewId,
      {
        ...request.body,
        chapterId: parentReview.chapter_id,
        reviewerId: request.authUser?.id || null,
        reviewerName: request.authUser?.displayName || request.body.reviewerName
      }
    );

    await NotificationModel.create({
      recipientId: parentReview?.reviewer_id || parentReview?.reviewerId || "",
      actorId: request.authUser?.id || null,
      actorName: request.authUser?.displayName || request.body.reviewerName,
      type: "story_review_reply",
      title: `${request.authUser?.displayName || request.body.reviewerName} respondio una reseña en ${story.title}`,
      body: reviewText,
      routeView: "reading",
      routeIdentifier: story.slug || story.id
    });

    return response.status(201).json({ review });
  } catch (error) {
    return next(error);
  }
}

export async function likeStoryReview(request, response, next) {
  // Registra el like de una reseña o respuesta para el usuario actual.
  try {
    const story = await StoryModel.getByIdOrSlug(request.params.storyId);

    if (!canReadContent(story, request.authUser)) {
      return response.status(404).json({
        message: "Historia no encontrada"
      });
    }

    await readableReview(story, request.params.reviewId, request.authUser);
    const result = await ReviewModel.like(
      request.params.reviewId,
      request.authUser?.id || null
    );

    if (!result.alreadyLiked) {
      await NotificationModel.create({
        recipientId: result.review.reviewer_id || "",
        actorId: request.authUser?.id || null,
        actorName: request.authUser?.displayName || request.authUser?.email || "Miembro",
        type: "story_review_like",
        title: `${request.authUser?.displayName || request.authUser?.email || "Miembro"} indico que le gusta tu reseña en ${story.title}`,
        body: "Tu reseña sumo una nueva reaccion.",
        routeView: "reading",
        routeIdentifier: story.slug || story.id
      });
    }

    return response.json(result);
  } catch (error) {
    return next(error);
  }
}
