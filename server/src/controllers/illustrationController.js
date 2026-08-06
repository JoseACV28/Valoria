// Controlador HTTP de ilustraciones.
// Entrega galeria publica y detalle visual.
import { IllustrationModel } from "../models/illustrationModel.js";
import { NotificationModel } from "../models/notificationModel.js";

export async function getIllustrations(request, response, next) {
  // Lista las ilustraciones publicas visibles en la plataforma.
  try {
    const illustrations = await IllustrationModel.getAll(request.authUser?.id || null);
    response.json({
      total: illustrations.length,
      illustrations
    });
  } catch (error) {
    next(error);
  }
}

export async function getIllustrationById(request, response, next) {
  // Recupera el detalle de una ilustracion por UUID o slug publico.
  try {
    const illustration = await IllustrationModel.getByIdOrSlug(
      request.params.identifier,
      request.authUser?.id || null
    );

    if (!illustration) {
      return response.status(404).json({
        message: "Ilustracion no encontrada"
      });
    }

    return response.json({ illustration });
  } catch (error) {
    return next(error);
  }
}

export async function getMyIllustrations(request, response, next) {
  // Devuelve el portafolio privado del ilustrador autenticado.
  try {
    const illustrations = await IllustrationModel.getByAuthorId(request.authUser.id);
    return response.json({ illustrations });
  } catch (error) {
    return next(error);
  }
}

export async function createIllustration(request, response, next) {
  // Crea una ilustracion nueva junto a sus categorias, tags e imagenes asociadas.
  try {
    const { title } = request.body;

    if (!title) {
      return response.status(400).json({
        message: "title es obligatorio"
      });
    }

    const illustration = await IllustrationModel.create({
      ...request.body,
      authorId: request.authUser.id,
      authorName: request.authUser.displayName
    });

    return response.status(201).json({ illustration });
  } catch (error) {
    return next(error);
  }
}

export async function updateIllustration(request, response, next) {
  // Actualiza una ilustracion existente si pertenece al usuario autenticado.
  try {
    const illustration = await IllustrationModel.getByIdOrSlug(
      request.params.illustrationId
    );

    if (!illustration) {
      return response.status(404).json({
        message: "Ilustracion no encontrada"
      });
    }

    if (illustration.authorId !== request.authUser?.id) {
      return response.status(403).json({
        message: "No puedes editar ilustraciones de otra cuenta"
      });
    }

    const updatedIllustration = await IllustrationModel.update(
      illustration.id,
      request.body
    );

    return response.json({ illustration: updatedIllustration });
  } catch (error) {
    return next(error);
  }
}

export async function deleteIllustration(request, response, next) {
  // Elimina una ilustracion existente del autor autenticado.
  try {
    const illustration = await IllustrationModel.getByIdOrSlug(
      request.params.illustrationId
    );

    if (!illustration) {
      return response.status(404).json({
        message: "Ilustracion no encontrada"
      });
    }

    if (illustration.authorId !== request.authUser?.id) {
      return response.status(403).json({
        message: "No puedes eliminar ilustraciones de otra cuenta"
      });
    }

    await IllustrationModel.delete(illustration.id);
    return response.status(204).send();
  } catch (error) {
    return next(error);
  }
}

export async function getIllustrationComments(request, response, next) {
  // Recupera el hilo de comentarios asociado a la ilustracion.
  try {
    const illustration = await IllustrationModel.getByIdOrSlug(
      request.params.identifier,
      request.authUser?.id || null
    );

    if (!illustration) {
      return response.status(404).json({
        message: "Ilustracion no encontrada"
      });
    }

    const comments = await IllustrationModel.getComments(
      request.params.identifier,
      request.authUser?.id || null
    );

    return response.json({ comments });
  } catch (error) {
    return next(error);
  }
}

export async function createIllustrationComment(request, response, next) {
  // Publica un comentario nuevo en la ilustracion actual.
  try {
    const content = request.body.content?.trim() || "";

    if (!content) {
      return response.status(400).json({
        message: "Escribe un comentario antes de publicarlo"
      });
    }

    const illustration = await IllustrationModel.getByIdOrSlug(
      request.params.identifier,
      request.authUser?.id || null
    );

    if (!illustration) {
      return response.status(404).json({
        message: "Ilustracion no encontrada"
      });
    }

    const result = await IllustrationModel.createComment(request.params.identifier, {
      authorId: request.authUser.id,
      authorName: request.authUser.displayName || request.authUser.email,
      parentCommentId: request.body.parentCommentId || null,
      content
    });

    let notificationRecipientId = illustration.authorId;
    let notificationType = "illustration_comment";
    let notificationTitle = `${request.authUser.displayName || request.authUser.email} comento tu ilustracion`;

    if (request.body.parentCommentId) {
      const parentComment = await IllustrationModel.getCommentById(
        request.body.parentCommentId
      );

      if (parentComment?.authorId) {
        notificationRecipientId = parentComment.authorId;
        notificationType = "illustration_reply";
        notificationTitle = `${request.authUser.displayName || request.authUser.email} respondio tu comentario`;
      }
    }

    await NotificationModel.create({
      recipientId: notificationRecipientId,
      actorId: request.authUser.id,
      actorName: request.authUser.displayName || request.authUser.email,
      type: notificationType,
      title: notificationTitle,
      body: content,
      routeView: "profile",
      routeTab: "illustrations"
    });

    return response.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function getIllustrationFanarts(request, response, next) {
  // Recupera la galeria de fanarts hechos por la comunidad sobre una ilustracion.
  try {
    const illustration = await IllustrationModel.getByIdOrSlug(
      request.params.identifier,
      request.authUser?.id || null
    );

    if (!illustration) {
      return response.status(404).json({
        message: "Ilustracion no encontrada"
      });
    }

    const fanarts = await IllustrationModel.getFanarts(request.params.identifier);
    return response.json({ fanarts });
  } catch (error) {
    return next(error);
  }
}

export async function createIllustrationFanart(request, response, next) {
  // Permite que la comunidad suba un fanart visual asociado a la pieza del creador.
  try {
    const publicUrl = request.body.publicUrl?.trim() || "";

    if (!publicUrl) {
      return response.status(400).json({
        message: "Debes subir una imagen antes de publicar el fanart"
      });
    }

    const result = await IllustrationModel.createFanart(request.params.identifier, {
      title: request.body.title?.trim() || "Fanart de comunidad",
      publicUrl,
      storagePath: request.body.storagePath?.trim() || "",
      altText: request.body.altText?.trim() || request.body.title?.trim() || "",
      contributorId: request.authUser.id,
      contributorName: request.authUser.displayName || request.authUser.email
    });

    await NotificationModel.create({
      recipientId: result.illustration?.authorId || "",
      actorId: request.authUser.id,
      actorName: request.authUser.displayName || request.authUser.email,
      type: "illustration_fanart",
      title: `${request.authUser.displayName || request.authUser.email} subio un fanart de tu ilustracion`,
      body: result.fanart?.title || "Tu obra visual recibio un nuevo fanart.",
      routeView: "profile",
      routeTab: "illustrations"
    });

    return response.status(201).json({ fanart: result.fanart });
  } catch (error) {
    return next(error);
  }
}

export async function likeIllustration(request, response, next) {
  // Alterna el like del usuario autenticado sobre la ilustracion.
  try {
    const result = await IllustrationModel.toggleLike(
      request.params.identifier,
      request.authUser.id
    );

    if (result.liked) {
      const illustration = await IllustrationModel.getByIdOrSlug(
        request.params.identifier,
        request.authUser.id
      );

      await NotificationModel.create({
        recipientId: illustration?.authorId || "",
        actorId: request.authUser.id,
        actorName: request.authUser.displayName || request.authUser.email,
        type: "illustration_like",
        title: `${request.authUser.displayName || request.authUser.email} indico que le gusta tu ilustracion`,
        body: illustration?.title || "Tu obra visual recibio una nueva reaccion.",
        routeView: "profile",
        routeTab: "illustrations"
      });
    }

    return response.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function likeIllustrationComment(request, response, next) {
  // Alterna el like del usuario autenticado sobre un comentario de ilustracion.
  try {
    const result = await IllustrationModel.toggleCommentLike(
      request.params.identifier,
      request.params.commentId,
      request.authUser.id
    );

    if (result.liked) {
      await NotificationModel.create({
        recipientId: result.authorId || "",
        actorId: request.authUser.id,
        actorName: request.authUser.displayName || request.authUser.email,
        type: "illustration_comment_like",
        title: `${request.authUser.displayName || request.authUser.email} indico que le gusta tu comentario`,
        body: "Tu comentario en ilustraciones sumo una nueva reaccion.",
        routeView: "profile",
        routeTab: "illustrations"
      });
    }

    return response.json(result);
  } catch (error) {
    return next(error);
  }
}
