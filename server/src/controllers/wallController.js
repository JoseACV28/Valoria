import { blockedProfileIds } from '../middlewares/profileBlocks.js';
// Controlador HTTP del muro de creador.
// Expone publicaciones, comentarios, respuestas y likes del perfil.
import { WallModel } from "../models/wallModel.js";
import { NotificationModel } from "../models/notificationModel.js";

export async function getCommunityFeed(request, response, next) {
  // Devuelve una seleccion corta de actividad para la seccion Comunidad del home.
  try {
    const limit = Number(request.query.limit || 6);
    const blocked=await blockedProfileIds(request.authUser?.id);
    const posts = (await WallModel.getCommunityFeed(limit)).filter(item=>!blocked.has(item.authorId||item.creatorId||item.creator_id));
    return response.json({ posts });
  } catch (error) {
    return next(error);
  }
}

export async function getCreatorWall(request, response, next) {
  // Carga el muro completo del creador, con publicaciones, replies y likes.
  try {
    const posts = await WallModel.getByCreatorId(
      request.params.profileId,
      request.authUser?.id || null
    );
    return response.json({ posts });
  } catch (error) {
    return next(error);
  }
}

export async function createCreatorPost(request, response, next) {
  // Publica un nuevo estado del creador dentro de su propio muro.
  try {
    const creatorId = request.params.profileId;

    if (request.authUser?.id !== creatorId) {
      return response.status(403).json({
        message: "Solo el creador puede publicar estados en su muro"
      });
    }

    if (!request.body.content?.trim()) {
      return response.status(400).json({
        message: "content es obligatorio"
      });
    }

    const post = await WallModel.createPost(creatorId, {
      content: request.body.content.trim(),
      authorId: request.authUser.id,
      authorName: request.authUser.displayName
    });

    return response.status(201).json({ post });
  } catch (error) {
    return next(error);
  }
}

export async function updateCreatorPost(request, response, next) {
  // Edita el texto de una publicacion ya existente del muro.
  try {
    if (!request.body.content?.trim()) {
      return response.status(400).json({
        message: "content es obligatorio"
      });
    }

    const post = await WallModel.updatePost(
      request.params.profileId,
      request.params.postId,
      { content: request.body.content.trim() },
      request.authUser.id
    );

    return response.json({ post });
  } catch (error) {
    return next(error);
  }
}

export async function deleteCreatorPost(request, response, next) {
  // Elimina una publicacion del muro si el usuario tiene permisos.
  try {
    await WallModel.deletePost(
      request.params.profileId,
      request.params.postId,
      request.authUser.id
    );

    return response.status(204).send();
  } catch (error) {
    return next(error);
  }
}

export async function createWallComment(request, response, next) {
  // Inserta un comentario o respuesta dentro de una publicacion del muro.
  try {
    if (!request.body.content?.trim()) {
      return response.status(400).json({
        message: "content es obligatorio"
      });
    }

    const comment = await WallModel.createComment(
      request.params.profileId,
      request.params.postId,
      {
        content: request.body.content.trim(),
        parentCommentId: request.body.parentCommentId || null,
        authorId: request.authUser.id,
        authorName: request.authUser.displayName
      }
    );

    let notificationRecipientId = request.params.profileId;
    let notificationTitle = `${request.authUser.displayName} comento en tu muro`;

    if (request.body.parentCommentId) {
      const parentComment = await WallModel.getCommentById(request.body.parentCommentId);

      if (parentComment?.authorId) {
        notificationRecipientId = parentComment.authorId;
        notificationTitle = `${request.authUser.displayName} respondio tu comentario`;
      }
    }

    await NotificationModel.create({
      threadId: request.params.postId,
      recipientId: notificationRecipientId,
      actorId: request.authUser.id,
      actorName: request.authUser.displayName,
      type: request.body.parentCommentId ? "wall_reply" : "wall_comment",
      title: notificationTitle,
      body: request.body.content.trim(),
      routeView: "profile",
      routeTab: "wall"
    });

    return response.status(201).json({ comment });
  } catch (error) {
    return next(error);
  }
}

export async function updateWallComment(request, response, next) {
  // Modifica un comentario ya existente del muro.
  try {
    if (!request.body.content?.trim()) {
      return response.status(400).json({
        message: "content es obligatorio"
      });
    }

    const comment = await WallModel.updateComment(
      request.params.profileId,
      request.params.commentId,
      { content: request.body.content.trim() },
      request.authUser.id
    );

    return response.json({ comment });
  } catch (error) {
    return next(error);
  }
}

export async function deleteWallComment(request, response, next) {
  // Elimina un comentario del muro respetando permisos de autor o creador.
  try {
    await WallModel.deleteComment(
      request.params.profileId,
      request.params.commentId,
      request.authUser.id
    );

    return response.status(204).send();
  } catch (error) {
    return next(error);
  }
}

export async function likeWallComment(request, response, next) {
  // Alterna el like del usuario actual sobre un comentario del muro.
  try {
    const comment = await WallModel.likeComment(
      request.params.profileId,
      request.params.commentId,
      request.authUser.id
    );

    if (comment.likedByCurrentUser) {
      await NotificationModel.create({
      threadId: request.params.postId,
        recipientId: comment.authorId,
        actorId: request.authUser.id,
        actorName: request.authUser.displayName,
        type: "wall_comment_like",
        title: `${request.authUser.displayName} indico que le gusta tu comentario`,
        body: "Tu comentario recibio una nueva reaccion en el muro.",
        routeView: "profile",
        routeTab: "wall"
      });
    }

    return response.json({ comment });
  } catch (error) {
    return next(error);
  }
}
