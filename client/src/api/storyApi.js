// Capa de acceso a la API de historias.
// Reune lecturas, creacion, capitulos, reseñas y subida de imagenes.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export async function fetchStories() {
  // Lista historias publicas visibles en home, directorios y sugerencias.
  const response = await fetch(`${API_URL}/stories`);

  if (!response.ok) {
    throw new Error("No se pudieron cargar las historias");
  }

  return response.json();
}

async function handleJson(response) {
  // Unifica el parseo de respuestas y la propagacion de errores del backend de historias.
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message || "Ocurrio un error en la solicitud");
  }

  return payload;
}

function buildAuthHeaders(token) {
  // Inserta cabeceras bearer solo cuando la accion necesita sesion.
  return token
    ? {
        Authorization: `Bearer ${token}`
      }
    : {};
}

export async function uploadStoryCover(file, altText = "", token = "") {
  // Sube la portada principal de una historia.
  const formData = new FormData();
  formData.append("image", file);
  formData.append("altText", altText);

  const response = await fetch(`${API_URL}/uploads/story-cover`, {
    method: "POST",
    headers: buildAuthHeaders(token),
    body: formData
  });

  return handleJson(response);
}

export async function uploadChapterImage(file, altText = "", token = "") {
  // Sube una imagen vinculada a un capitulo.
  const formData = new FormData();
  formData.append("image", file);
  formData.append("altText", altText);

  const response = await fetch(`${API_URL}/uploads/chapter-image`, {
    method: "POST",
    headers: buildAuthHeaders(token),
    body: formData
  });

  return handleJson(response);
}

export async function createStory(payload, token = "") {
  // Crea una historia nueva dentro del panel de autor.
  const response = await fetch(`${API_URL}/stories`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...buildAuthHeaders(token)
    },
    body: JSON.stringify(payload)
  });

  return handleJson(response);
}

export async function updateStory(storyId, payload, token = "") {
  // Guarda cambios de metadata editorial de una historia.
  const response = await fetch(`${API_URL}/stories/${storyId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...buildAuthHeaders(token)
    },
    body: JSON.stringify(payload)
  });

  return handleJson(response);
}

export async function deleteStory(storyId, token = "") {
  // Elimina una historia completa y su arbol de contenido asociado.
  const response = await fetch(`${API_URL}/stories/${storyId}`, {
    method: "DELETE",
    headers: buildAuthHeaders(token)
  });

  if (!response.ok) {
    return handleJson(response);
  }

  return { success: true };
}

export async function createChapter(storyId, payload, token = "") {
  // Agrega un nuevo capitulo a la historia indicada.
  const response = await fetch(`${API_URL}/stories/${storyId}/chapters`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...buildAuthHeaders(token)
    },
    body: JSON.stringify(payload)
  });

  return handleJson(response);
}

export async function updateChapter(storyId, chapterId, payload, token = "") {
  // Actualiza contenido, numero o estado de un capitulo existente.
  const response = await fetch(
    `${API_URL}/stories/${storyId}/chapters/${chapterId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...buildAuthHeaders(token)
      },
      body: JSON.stringify(payload)
    }
  );

  return handleJson(response);
}

export async function deleteChapter(storyId, chapterId, token = "") {
  // Elimina un capitulo puntual de la historia.
  const response = await fetch(
    `${API_URL}/stories/${storyId}/chapters/${chapterId}`,
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

export async function addChapterIllustration(
  storyId,
  chapterId,
  payload,
  token = ""
) {
  // Asocia una ilustracion del creador o de la comunidad a un capitulo.
  const response = await fetch(
    `${API_URL}/stories/${storyId}/chapters/${chapterId}/illustrations`,
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

export async function fetchMyStories(token = "") {
  // Recupera la biblioteca privada del creador autenticado.
  const response = await fetch(`${API_URL}/stories/mine/list`, {
    headers: buildAuthHeaders(token)
  });

  return handleJson(response);
}

export async function fetchStoryChapters(storyId) {
  // Carga la lista de capitulos para lectura o gestion editorial.
  const response = await fetch(`${API_URL}/stories/${storyId}/chapters`);

  return handleJson(response);
}

export async function fetchStory(identifier) {
  // Recupera una historia por id o slug publico.
  const response = await fetch(`${API_URL}/stories/${identifier}`);

  return handleJson(response);
}

export async function fetchStoryReviews(storyId, token = "", chapterId = "") {
  // Obtiene reseñas y respuestas del capitulo seleccionado.
  const query = chapterId
    ? `?chapterId=${encodeURIComponent(chapterId)}`
    : "";
  const response = await fetch(`${API_URL}/stories/${storyId}/reviews${query}`, {
    headers: buildAuthHeaders(token)
  });

  return handleJson(response);
}

export async function createStoryReview(storyId, payload, token = "") {
  // Publica una reseña principal sobre la historia/capitulo activo.
  const response = await fetch(`${API_URL}/stories/${storyId}/reviews`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...buildAuthHeaders(token)
    },
    body: JSON.stringify(payload)
  });

  return handleJson(response);
}

export async function likeStoryReview(storyId, reviewId, token = "") {
  // Alterna el like sobre una reseña o respuesta.
  const response = await fetch(`${API_URL}/stories/${storyId}/reviews/${reviewId}/like`, {
    method: "POST",
    headers: buildAuthHeaders(token)
  });

  return handleJson(response);
}

export async function replyToStoryReview(storyId, reviewId, payload, token = "") {
  // Crea una respuesta dentro del hilo de reseñas.
  const response = await fetch(`${API_URL}/stories/${storyId}/reviews/${reviewId}/reply`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...buildAuthHeaders(token)
    },
    body: JSON.stringify(payload)
  });

  return handleJson(response);
}

export async function registerStoryRead(storyId) {
  // Registra una lectura para alimentar la metrica publica de vistas.
  const response = await fetch(`${API_URL}/stories/${storyId}/read`, {
    method: "POST"
  });

  return handleJson(response);
}
