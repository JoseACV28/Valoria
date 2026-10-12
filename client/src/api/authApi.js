import { authRequest } from '../utils/authRequest.js';
// Capa de acceso a la API de autenticacion del servidor.
// Centraliza registro, login y recuperacion de la sesion actual.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

async function handleJson(response) {
  // Centraliza el parseo de respuestas y transforma errores HTTP en mensajes legibles para la UI.
  const payload = await response.json();

  if (!response.ok) {
    throw Object.assign(new Error(payload.message || "Ocurrio un error de autenticacion"),{status:response.status,code:payload.code});
  }

  return payload;
}

export async function registerUser(payload) {
  // Crea una cuenta nueva y devuelve la sesion inicial del usuario.
  return authRequest(`${API_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

export async function loginUser(payload) {
  // Inicia sesion con correo y contrasena contra el backend principal.
  return authRequest(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
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

export async function logoutUser(token) {
  if (!token) return;
  const response = await fetch(`${API_URL}/auth/logout`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok && response.status !== 401) await handleJson(response);
}

export async function changePassword(token,payload){return handleJson(await fetch(`${API_URL}/auth/change-password`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(payload)}));}
export async function logoutAllUsersSessions(token){const r=await fetch(`${API_URL}/auth/logout-all`,{method:'POST',headers:{Authorization:`Bearer ${token}`}});if(!r.ok)await handleJson(r);}
