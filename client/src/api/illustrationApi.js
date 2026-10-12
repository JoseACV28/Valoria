// Capa de acceso a la vertical de ilustraciones.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

async function handleJson(response) {
  // Convierte respuestas HTTP en JSON y conserva mensajes de error de la API.
  const payload = await response.json();

  if (!response.ok) {
    throw Object.assign(new Error(payload.message || "Ocurrio un error al cargar ilustraciones"), {
      status: response.status
    });
  }

  return payload;
}

function buildAuthHeaders(token) {
  // Agrega cabeceras de autorizacion solo cuando hay sesion vigente.
  return token
    ? {
        Authorization: `Bearer ${token}`
      }
    : {};
}

export async function fetchIllustrations(token="") {
  // Devuelve la lista publica de ilustraciones para home, directorios y exploracion.
  const response = await fetch(`${API_URL}/illustrations`,{headers:buildAuthHeaders(token)});
  return handleJson(response);
}

export async function fetchIllustration(identifier, token = "") {
  // Recupera una ilustracion puntual por UUID o slug publico.
  const response = await fetch(`${API_URL}/illustrations/${identifier}`, {
    headers: buildAuthHeaders(token)
  });
  return handleJson(response);
}

export async function fetchIllustrationComments(identifier, token = "") {
  // Trae la conversacion social asociada al detalle de la ilustracion.
  const response = await fetch(`${API_URL}/illustrations/${identifier}/comments`, {
    headers: buildAuthHeaders(token)
  });

  return handleJson(response);
}

export async function fetchIllustrationFanarts(identifier, token = "") {
  // Recupera la galeria de fanarts de comunidad para una ilustracion puntual.
  const response = await fetch(`${API_URL}/illustrations/${identifier}/fanarts`, {
    headers: buildAuthHeaders(token)
  });

  return handleJson(response);
}

export async function uploadIllustrationCover(file, altText = "", token = "") {
  // Sube la portada visual principal de una ilustracion.
  const formData = new FormData();
  formData.append("image", file);
  formData.append("altText", altText);

  const response = await fetch(`${API_URL}/uploads/illustration-cover`, {
    method: "POST",
    headers: buildAuthHeaders(token),
    body: formData
  });

  return handleJson(response);
}

export async function uploadIllustrationImage(file, altText = "", token = "") {
  // Sube una imagen de galeria o pieza principal para la ilustracion.
  const formData = new FormData();
  formData.append("image", file);
  formData.append("altText", altText);

  const response = await fetch(`${API_URL}/uploads/illustration-image`, {
    method: "POST",
    headers: buildAuthHeaders(token),
    body: formData
  });

  return handleJson(response);
}

export async function fetchMyIllustrations(token = "") {
  // Lista privada de ilustraciones del autor autenticado.
  const response = await fetch(`${API_URL}/illustrations/mine/list`, {
    headers: buildAuthHeaders(token)
  });

  return handleJson(response);
}

export async function createIllustration(payload, token = "") {
  // Crea una ilustracion nueva en el panel del ilustrador.
  const response = await fetch(`${API_URL}/illustrations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...buildAuthHeaders(token)
    },
    body: JSON.stringify(payload)
  });

  return handleJson(response);
}

export async function updateIllustration(illustrationId, payload, token = "") {
  // Guarda cambios editoriales sobre una ilustracion existente.
  const response = await fetch(`${API_URL}/illustrations/${illustrationId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...buildAuthHeaders(token)
    },
    body: JSON.stringify(payload)
  });

  return handleJson(response);
}

export async function deleteIllustration(illustrationId, token = "") {
  // Elimina una ilustracion del portafolio del autor.
  const response = await fetch(`${API_URL}/illustrations/${illustrationId}`, {
    method: "DELETE",
    headers: buildAuthHeaders(token)
  });

  if (!response.ok) {
    return handleJson(response);
  }

  return { success: true };
}

export async function createIllustrationComment(identifier, payload, token = "") {
  // Publica un comentario dentro del detalle social de una ilustracion.
  const response = await fetch(`${API_URL}/illustrations/${identifier}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...buildAuthHeaders(token)
    },
    body: JSON.stringify(payload)
  });

  return handleJson(response);
}

export async function createIllustrationFanart(identifier, payload, token = "") {
  // Publica una pieza de comunidad como fanart sobre la ilustracion actual.
  const response = await fetch(`${API_URL}/illustrations/${identifier}/fanarts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...buildAuthHeaders(token)
    },
    body: JSON.stringify(payload)
  });

  return handleJson(response);
}

export async function likeIllustration(identifier, token = "") {
  // Alterna el like del usuario autenticado sobre una ilustracion.
  const response = await fetch(`${API_URL}/illustrations/${identifier}/like`, {
    method: "POST",
    headers: buildAuthHeaders(token)
  });

  return handleJson(response);
}

export async function likeIllustrationComment(
  identifier,
  commentId,
  token = ""
) {
  // Alterna el like del usuario autenticado sobre un comentario de ilustracion.
  const response = await fetch(
    `${API_URL}/illustrations/${identifier}/comments/${commentId}/like`,
    {
      method: "POST",
      headers: buildAuthHeaders(token)
    }
  );

  return handleJson(response);
}
