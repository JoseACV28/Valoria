// Controlador HTTP de notificaciones.
// Expone la bandeja del usuario autenticado y la lectura de notificaciones.
import { NotificationModel } from "../models/notificationModel.js";

export async function getNotifications(request, response, next) {
  // Devuelve la bandeja reciente y el contador de no leidas del usuario actual.
  try {
    const limit = Number(request.query.limit || 20);
    const result = await NotificationModel.getByRecipient(request.authUser.id, limit);
    return response.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function markAllNotificationsRead(request, response, next) {
  // Marca toda la bandeja del usuario autenticado como leida.
  try {
    await NotificationModel.markAllRead(request.authUser.id);
    return response.status(204).send();
  } catch (error) {
    return next(error);
  }
}

export async function markNotificationRead(request, response, next) {
  // Marca una sola notificacion como leida.
  try {
    await NotificationModel.markRead(request.authUser.id, request.params.notificationId);
    return response.status(204).send();
  } catch (error) {
    return next(error);
  }
}
