// Capa de acceso a la API de autenticacion del servidor.
// Centraliza registro, login y recuperacion de la sesion actual.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

async function handleJson(response) {
  // Centraliza el parseo de respuestas y transforma errores HTTP en mensajes legibles para la UI.
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message || "Ocurrio un error de autenticacion");
  }

  return payload;
}

export async function registerUser(payload) {
  // Crea una cuenta nueva y devuelve la sesion inicial del usuario.
  const response = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return handleJson(response);
}

export async function loginUser(payload) {
  // Inicia sesion con correo y contrasena contra el backend principal.
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return handleJson(response);
}

export async function fetchCurrentUser(token) {
  // Recupera el perfil autenticado asociado al token actual.
  const response = await fetch(`${API_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return handleJson(response);
}
