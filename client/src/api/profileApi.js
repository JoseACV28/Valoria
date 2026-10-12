// Capa de acceso al perfil y muro de creador.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

function buildAuthHeaders(token) {
  // Devuelve cabeceras autenticadas solo para acciones protegidas.
  return token
    ? {
        Authorization: `Bearer ${token}`
      }
    : {};
}

async function handleJson(response) {
  // Normaliza respuestas del backend y detecta cuando una peticion devuelve HTML por error.
  const raw = await response.text();
  let payload = null;

  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error(
      raw?.includes("<!DOCTYPE") || raw?.includes("<html")
        ? "La API del muro devolvio HTML en vez de JSON. Revisa si la sesion sigue activa y si el backend esta actualizado."
        : raw || "Ocurrio un error en el muro"
    );
  }

  if (!response.ok) {
    throw new Error(payload.message || "Ocurrio un error en el muro");
  }

  return payload;
}

export async function fetchCreatorWall(profileId, token = "") {
  // Carga el muro de creador, con sus posts, comentarios y estados de like.
  const response = await fetch(`${API_URL}/profiles/${profileId}/wall`, {
    headers: buildAuthHeaders(token)
  });

  return handleJson(response);
}

export async function fetchCommunityFeed(limit = 6, token="") {
  // Recupera una muestra de actividad social para la portada y comunidad.
  const response = await fetch(`${API_URL}/profiles/community/feed?limit=${limit}`,{headers:buildAuthHeaders(token)});
  return handleJson(response);
}

export async function fetchProfile(profileId, token = "") {
  // Obtiene la vista de perfil publico o autenticado del creador indicado.
  const response = await fetch(`${API_URL}/profiles/${profileId}`, {
    headers: buildAuthHeaders(token)
  });

  return handleJson(response);
}

export async function updateProfile(profileId, payload, token = "") {
  // Guarda cambios de identidad publica, descripcion, avatar y portada.
  const response = await fetch(`${API_URL}/profiles/${profileId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...buildAuthHeaders(token)
    },
    body: JSON.stringify(payload)
  });

  return handleJson(response);
}

export async function uploadProfileAvatar(file, altText = "", token = "") {
  // Sube el avatar del perfil a storage.
  const formData = new FormData();
  formData.append("image", file);
  formData.append("altText", altText);

  const response = await fetch(`${API_URL}/uploads/profile-avatar`, {
    method: "POST",
    headers: buildAuthHeaders(token),
    body: formData
  });

  return handleJson(response);
}

export async function uploadProfileCover(file, altText = "", token = "") {
  // Sube la imagen de fondo o portada del perfil.
  const formData = new FormData();
  formData.append("image", file);
  formData.append("altText", altText);

  const response = await fetch(`${API_URL}/uploads/profile-cover`, {
    method: "POST",
    headers: buildAuthHeaders(token),
    body: formData
  });

  return handleJson(response);
}

export async function followProfile(profileId, token = "") {
  // Crea la relacion de seguimiento hacia otro perfil.
  const response = await fetch(`${API_URL}/profiles/${profileId}/follow`, {
    method: "POST",
    headers: buildAuthHeaders(token)
  });

  return handleJson(response);
}

export async function unfollowProfile(profileId, token = "") {
  // Elimina la relacion de seguimiento hacia otro perfil.
  const response = await fetch(`${API_URL}/profiles/${profileId}/follow`, {
    method: "DELETE",
    headers: buildAuthHeaders(token)
  });

  return handleJson(response);
}

export async function fetchFollowingProfiles(profileId, token = "") {
  // Lista los perfiles que sigue un usuario o creador.
  const response = await fetch(`${API_URL}/profiles/${profileId}/following`, {
    headers: buildAuthHeaders(token)
  });

  return handleJson(response);
}

export async function createCreatorWallPost(profileId, payload, token = "") {
  // Publica un nuevo estado en el muro del creador.
  const response = await fetch(`${API_URL}/profiles/${profileId}/wall/posts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...buildAuthHeaders(token)
    },
    body: JSON.stringify(payload)
  });

  return handleJson(response);
}

export async function updateCreatorWallPost(profileId, postId, payload, token = "") {
  // Edita una publicacion existente del muro.
  const response = await fetch(
    `${API_URL}/profiles/${profileId}/wall/posts/${postId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...buildAuthHeaders(token)
      },
      body: JSON.stringify(payload)
    }
  );

  return handleJson(response);
}

export async function deleteCreatorWallPost(profileId, postId, token = "") {
  // Elimina una publicacion del muro del creador.
  const response = await fetch(
    `${API_URL}/profiles/${profileId}/wall/posts/${postId}`,
    {
      method: "DELETE",
      headers: buildAuthHeaders(token)
    }
  );

  if (!response.ok) {
    return handleJson(response);
  }

  return { success: true };
}

export async function createCreatorWallComment(profileId, postId, payload, token = "") {
  // Agrega un comentario o respuesta a un estado del muro.
  const response = await fetch(
    `${API_URL}/profiles/${profileId}/wall/posts/${postId}/comments`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildAuthHeaders(token)
      },
      body: JSON.stringify(payload)
    }
  );

  return handleJson(response);
}

export async function updateCreatorWallComment(profileId, commentId, payload, token = "") {
  // Edita un comentario existente dentro del muro.
  const response = await fetch(
    `${API_URL}/profiles/${profileId}/wall/comments/${commentId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...buildAuthHeaders(token)
      },
      body: JSON.stringify(payload)
    }
  );

  return handleJson(response);
}

export async function deleteCreatorWallComment(profileId, commentId, token = "") {
  // Elimina un comentario del muro cuando el usuario tiene permisos.
  const response = await fetch(
    `${API_URL}/profiles/${profileId}/wall/comments/${commentId}`,
    {
      method: "DELETE",
      headers: buildAuthHeaders(token)
    }
  );

  if (!response.ok) {
    return handleJson(response);
  }

  return { success: true };
}

export async function likeCreatorWallComment(profileId, commentId, token = "") {
  // Alterna el like del usuario actual sobre un comentario del muro.
  const response = await fetch(
    `${API_URL}/profiles/${profileId}/wall/comments/${commentId}/like`,
    {
      method: "POST",
      headers: buildAuthHeaders(token)
    }
  );

  return handleJson(response);
}
