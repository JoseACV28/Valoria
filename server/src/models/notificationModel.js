import {listWorkspaceRows} from './workspaceModel.js';
import { profilesBlocked } from '../middlewares/profileBlocks.js';
// Modelo de notificaciones.
// Centraliza altas, lectura y listado de interacciones para creadores y lectores.
import { randomUUID } from "node:crypto";
import { isSupabaseEnabled, supabaseAdmin } from "../config/supabase.js";

const demoNotifications = [];

function isMissingNotificationsTableError(message = "") {
  // Detecta instalaciones donde la tabla de notificaciones aun no fue creada en base.
  return message.includes("user_notifications");
}

function syncActorNameInTitle(title = "", actorName = "") {
  // Reescribe el prefijo del titulo para que siempre use el seudonimo vigente del actor.
  if (!title || !actorName) {
    return title;
  }

  return title.replace(
    /^(.*?)\s+(comenzo|comento|respondio|indico|dejo|subio)\b/i,
    `${actorName} $2`
  );
}

function mapNotification(notification) {
  // Normaliza el registro de base al formato consumido por el cliente.
  const actorName = notification.actor_name || "Miembro de la comunidad";
  return {
    id: notification.id,
    recipientId: notification.recipient_id,
    actorId: notification.actor_id || "",
    actorName,
    actorAvatarUrl: notification.actor_avatar_url || "",
    type: notification.type,
    title: syncActorNameInTitle(notification.title, actorName),
    body: notification.body || "",
    routeView: notification.route_view || "",
    routeIdentifier: notification.route_identifier || "",
    routeTab: notification.route_tab || "",
    readAt: notification.read_at || "",
    isRead: Boolean(notification.read_at),
    createdAt: notification.created_at
  };
}

async function resolveStoryRouteFromReviewNotification(notification) {
  // Reconstruye el destino de notificaciones antiguas de reseñas que quedaron
  // apuntando al perfil, usando el texto de la reseña como pista.
  if (
    !isSupabaseEnabled() ||
    !notification?.body ||
    !notification?.type?.startsWith("story_review")
  ) {
    return null;
  }

  const { data: reviews, error } = await supabaseAdmin
    .from("story_reviews")
    .select("story_id, reviewer_id, reviewer_name, review_text")
    .eq("review_text", notification.body)
    .limit(10);

  if (error) {
    throw new Error(error.message);
  }

  const matchedReview = (reviews || []).find((review) => {
    if (notification.actor_id && review.reviewer_id) {
      return review.reviewer_id === notification.actor_id;
    }

    return (
      String(review.reviewer_name || "").trim().toLowerCase() ===
      String(notification.actor_name || "").trim().toLowerCase()
    );
  });

  if (!matchedReview?.story_id) {
    return null;
  }

  const { data: story, error: storyError } = await supabaseAdmin
    .from("stories")
    .select("id, slug")
    .eq("id", matchedReview.story_id)
    .maybeSingle();

  if (storyError) {
    throw new Error(storyError.message);
  }

  if (!story) {
    return null;
  }

  return {
    route_view: "reading",
    route_identifier: story.slug || story.id,
    route_tab: ""
  };
}

async function repairLegacyNotificationRoute(notification) {
  // Repara en caliente notificaciones antiguas de reseñas para que vuelvan a
  // apuntar a la historia correspondiente.
  if (
    !isSupabaseEnabled() ||
    !notification?.id ||
    notification.route_identifier ||
    notification.route_view !== "profile" ||
    !notification.type?.startsWith("story_review")
  ) {
    return notification;
  }

  const repairedRoute = await resolveStoryRouteFromReviewNotification(notification);

  if (!repairedRoute) {
    return notification;
  }

  const { data, error } = await supabaseAdmin
    .from("user_notifications")
    .update(repairedRoute)
    .eq("id", notification.id)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data || { ...notification, ...repairedRoute };
}

async function refreshNotificationActor(notification) {
  // Rehidrata nombre y avatar del actor para que cambios de seudonimo se reflejen
  // tambien en notificaciones antiguas.
  if (!isSupabaseEnabled() || !notification?.actor_id) {
    return notification;
  }

  const actor = await resolveActorSnapshot(
    notification.actor_id,
    notification.actor_name || "Miembro de la comunidad"
  );

  if (
    actor.actorName === (notification.actor_name || "") &&
    actor.actorAvatarUrl === (notification.actor_avatar_url || "")
  ) {
    return notification;
  }

  const payload = {
    actor_name: actor.actorName,
    actor_avatar_url: actor.actorAvatarUrl
  };

  const { data, error } = await supabaseAdmin
    .from("user_notifications")
    .update(payload)
    .eq("id", notification.id)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data || { ...notification, ...payload };
}

async function resolveActorSnapshot(actorId, fallbackName = "") {
  // Recupera nombre y avatar vigentes del actor que gatillo la notificacion.
  if (!actorId || !isSupabaseEnabled()) {
    return {
      actorName: fallbackName || "Miembro de la comunidad",
      actorAvatarUrl: ""
    };
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", actorId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return {
    actorName: data?.display_name || fallbackName || "Miembro de la comunidad",
    actorAvatarUrl: data?.avatar_url || ""
  };
}

export class NotificationModel {
  static async create(input) {
    if(await profilesBlocked(input.actorId,input.recipientId))return null;
    // Inserta una notificacion nueva cuando la interaccion proviene de otro usuario.
    if (!input.recipientId || input.recipientId === input.actorId) {
      return null;
    }

    if (!isSupabaseEnabled()) {
      const prefs=await listWorkspaceRows(input.recipientId,'preferences');
      const settings=prefs.find(x=>x.key==='notifications')?.data;
      if(input.type==='chapter_published'&&settings?.newChapters===false)return null;
      if(/comment|reply|review/.test(input.type)&&settings?.replies===false)return null;
      if(prefs.some(x=>(x.key===`mute-user:${input.actorId}`||(input.threadId&&x.key===`mute-thread:${input.threadId}`))&&x.data?.enabled))return null;
      const notification = {
        id: randomUUID(),
        recipient_id: input.recipientId,
        actor_id: input.actorId || null,
        actor_name: input.actorName || "Miembro de la comunidad",
        actor_avatar_url: "",
        type: input.type,
        title: input.title,
        body: input.body || "",
        route_view: input.routeView || "",
        route_identifier: input.routeIdentifier || "",
        route_tab: input.routeTab || "",
        read_at: null,
        created_at: new Date().toISOString()
      };
      demoNotifications.unshift(notification);
      return mapNotification(notification);
    }

    const {data:preference,error:preferenceError}=await supabaseAdmin.from('user_workspace').select('data').eq('user_id',input.recipientId).eq('namespace','preferences').eq('key','notifications').maybeSingle();
    if(preferenceError)return null;
    if((input.type==='chapter_published' && preference?.data?.newChapters===false) || (/comment|reply|review/.test(input.type) && preference?.data?.replies===false))return null;
    const muteKeys=[`mute-user:${input.actorId}`,...(input.threadId?[`mute-thread:${input.threadId}`]:[])];
    const {data:mutes,error:muteError}=await supabaseAdmin.from('user_workspace').select('data').eq('user_id',input.recipientId).eq('namespace','preferences').in('key',muteKeys);
    if(muteError)return null;
    if(mutes?.some(item=>item.data.enabled))return null;
    const actor = await resolveActorSnapshot(input.actorId, input.actorName);

    const payload = {
      recipient_id: input.recipientId,
      actor_id: input.actorId || null,
      actor_name: actor.actorName,
      actor_avatar_url: actor.actorAvatarUrl,
      type: input.type,
      title: syncActorNameInTitle(input.title, actor.actorName),
      body: input.body || "",
      route_view: input.routeView || "",
      route_identifier: input.routeIdentifier || "",
      route_tab: input.routeTab || ""
    };

    const { data, error } = await supabaseAdmin
      .from("user_notifications")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      if (isMissingNotificationsTableError(error.message)) {
        return null;
      }
      throw new Error(error.message);
    }

    return mapNotification(data);
  }

  static async getByRecipient(recipientId, limit = 20) {
    // Lista notificaciones recientes del usuario con su contador de no leidas.
    if (!recipientId) {
      return {
        notifications: [],
        unreadCount: 0
      };
    }

    if (!isSupabaseEnabled()) {
      const notifications = demoNotifications
        .filter((item) => item.recipient_id === recipientId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, limit)
        .map(mapNotification);

      return {
        notifications,
        unreadCount: notifications.filter((item) => !item.isRead).length
      };
    }

    const { data, error } = await supabaseAdmin
      .from("user_notifications")
      .select("*")
      .eq("recipient_id", recipientId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      if (isMissingNotificationsTableError(error.message)) {
        return {
          notifications: [],
          unreadCount: 0
        };
      }
      throw new Error(error.message);
    }

    const repairedNotifications = [];

    for (const notification of data || []) {
      const repairedRoute = await repairLegacyNotificationRoute(notification);
      repairedNotifications.push(await refreshNotificationActor(repairedRoute));
    }

    const notifications = repairedNotifications.map(mapNotification);

    return {
      notifications,
      unreadCount: notifications.filter((item) => !item.isRead).length
    };
  }

  static async markAllRead(recipientId) {
    // Marca toda la bandeja del usuario como leida.
    if (!recipientId) {
      return;
    }

    if (!isSupabaseEnabled()) {
      for (const notification of demoNotifications) {
        if (notification.recipient_id === recipientId && !notification.read_at) {
          notification.read_at = new Date().toISOString();
        }
      }
      return;
    }

    const { error } = await supabaseAdmin
      .from("user_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_id", recipientId)
      .is("read_at", null);

    if (error && !isMissingNotificationsTableError(error.message)) {
      throw new Error(error.message);
    }
  }

  static async markRead(recipientId, notificationId) {
    // Marca una sola notificacion como leida.
    if (!recipientId || !notificationId) {
      return;
    }

    if (!isSupabaseEnabled()) {
      const notification = demoNotifications.find(
        (item) => item.id === notificationId && item.recipient_id === recipientId
      );
      if (notification && !notification.read_at) {
        notification.read_at = new Date().toISOString();
      }
      return;
    }

    const { error } = await supabaseAdmin
      .from("user_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .eq("recipient_id", recipientId);

    if (error && !isMissingNotificationsTableError(error.message)) {
      throw new Error(error.message);
    }
  }
}
