// Controlador HTTP de reseñas de lectores y puntuaciones.
import { ReviewModel } from "../models/reviewModel.js";
import { StoryModel } from "../models/storyModel.js";
import { NotificationModel } from "../models/notificationModel.js";

export async function getStoryReviews(request, response, next) {
  // Devuelve las reseñas del capitulo activo con replies y estado de like.
  try {
    const story = await StoryModel.getByIdOrSlug(request.params.storyId);

    if (!story) {
      return response.status(404).json({
        message: "Historia no encontrada"
      });
    }

    const reviews = await ReviewModel.getByStoryId(
      story.id,
      request.authUser?.id || null,
      request.query.chapterId || null
    );
    return response.json({ reviews });
  } catch (error) {
    return next(error);
  }
}

export async function createStoryReview(request, response, next) {
  // Publica una reseña principal sobre una historia o capitulo.
  try {
    const story = await StoryModel.getByIdOrSlug(request.params.storyId);

    if (!story) {
      return response.status(404).json({
        message: "Historia no encontrada"
      });
    }

    const { rating, reviewText } = request.body;

    if (!rating || !reviewText) {
      return response.status(400).json({
        message: "rating y reviewText son obligatorios"
      });
    }

    if (Number(rating) < 1 || Number(rating) > 5) {
      return response.status(400).json({
        message: "La puntuacion debe estar entre 1 y 5"
      });
    }

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

    if (!story) {
      return response.status(404).json({
        message: "Historia no encontrada"
      });
    }

    const { reviewText } = request.body;

    if (!reviewText) {
      return response.status(400).json({
        message: "reviewText es obligatorio"
      });
    }

    const parentReview = await ReviewModel.getById(request.params.reviewId);

    const review = await ReviewModel.createReply(
      story.id,
      request.params.reviewId,
      {
        ...request.body,
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
  // Alterna el like de una reseña o respuesta para el usuario actual.
  try {
    const story = await StoryModel.getByIdOrSlug(request.params.storyId);

    if (!story) {
      return response.status(404).json({
        message: "Historia no encontrada"
      });
    }

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
