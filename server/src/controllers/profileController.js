// Controlador HTTP del perfil publico.
// Entrega datos del creador y gestiona seguimiento entre usuarios.
import { ProfileModel } from "../models/profileModel.js";
import { NotificationModel } from "../models/notificationModel.js";

export async function getProfile(request, response, next) {
  // Recupera el perfil publico del creador, enriquecido con contexto del visitante.
  try {
    const profile = await ProfileModel.getById(
      request.params.profileId,
      request.authUser?.id || null
    );
    return response.json({ profile });
  } catch (error) {
    return next(error);
  }
}

export async function followProfile(request, response, next) {
  // Crea la relacion de seguimiento entre el usuario autenticado y el perfil visitado.
  try {
    const result = await ProfileModel.follow(
      request.params.profileId,
      request.authUser.id
    );
    await NotificationModel.create({
      recipientId: request.params.profileId,
      actorId: request.authUser.id,
      actorName: request.authUser.displayName,
      type: "follow",
      title: `${request.authUser.displayName} comenzo a seguirte`,
      body: "Tu perfil sumo un nuevo seguidor dentro de Valoria.",
      routeView: "profile",
      routeTab: "following"
    });
    return response.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function unfollowProfile(request, response, next) {
  // Elimina la relacion de seguimiento entre el usuario autenticado y el perfil visitado.
  try {
    const result = await ProfileModel.unfollow(
      request.params.profileId,
      request.authUser.id
    );
    return response.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function getFollowingProfiles(request, response, next) {
  // Devuelve el directorio de perfiles que sigue el usuario o creador consultado.
  try {
    const profiles = await ProfileModel.getFollowingProfiles(
      request.params.profileId,
      request.authUser?.id || null
    );
    return response.json({ profiles });
  } catch (error) {
    return next(error);
  }
}

export async function updateProfile(request, response, next) {
  // Guarda cambios de identidad visual y publica del perfil propio.
  try {
    if (request.authUser.id !== request.params.profileId) {
      return response.status(403).json({
        message: "Solo puedes editar tu propio perfil"
      });
    }

    const profile = await ProfileModel.updateProfile(request.params.profileId, {
      realName: request.body.realName?.trim() || "",
      displayName: request.body.displayName?.trim() || "",
      bio: request.body.bio?.trim() || "",
      avatarUrl: request.body.avatarUrl?.trim() || "",
      coverUrl: request.body.coverUrl?.trim() || ""
    });

    return response.json({ profile });
  } catch (error) {
    return next(error);
  }
}
