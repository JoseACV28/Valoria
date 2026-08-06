// Capa de acceso a notificaciones.
// Recupera la bandeja social del usuario y marca lecturas.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

function buildAuthHeaders(token) {
  // Adjunta el bearer token para endpoints protegidos.
  return token
    ? {
        Authorization: `Bearer ${token}`
      }
    : {};
}

async function handleJson(response) {
  // Normaliza errores y payloads JSON de la API de notificaciones.
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message || "No fue posible cargar las notificaciones");
  }

  return payload;
}

export async function fetchNotifications(token, limit = 20) {
  // Carga la bandeja reciente y el contador de no leidas.
  const response = await fetch(`${API_URL}/notifications?limit=${limit}`, {
    headers: buildAuthHeaders(token)
  });

  return handleJson(response);
}

export async function markNotificationRead(notificationId, token) {
  // Marca una notificacion individual como leida.
  const response = await fetch(`${API_URL}/notifications/${notificationId}/read`, {
    method: "POST",
    headers: buildAuthHeaders(token)
  });

  if (!response.ok) {
    return handleJson(response);
  }

  return { success: true };
}

export async function markAllNotificationsRead(token) {
  // Marca toda la bandeja del usuario como leida.
  const response = await fetch(`${API_URL}/notifications/read-all`, {
    method: "POST",
    headers: buildAuthHeaders(token)
  });

  if (!response.ok) {
    return handleJson(response);
  }

  return { success: true };
}
