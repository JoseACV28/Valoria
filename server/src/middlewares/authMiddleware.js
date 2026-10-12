// Middleware de autenticacion.
// Extrae el bearer token, resuelve el usuario y protege rutas privadas.
import { AuthModel } from "../models/authModel.js";

function getBearerToken(header = "") {
  // Extrae el token puro del header Authorization con formato Bearer.
  if (!header.startsWith("Bearer ")) {
    return "";
  }

  return header.slice("Bearer ".length).trim();
}

export async function attachAuthUser(request, response, next) {
  // Resuelve el usuario autenticado y lo deja disponible en request.authUser.
  try {
    const token = getBearerToken(request.headers.authorization);
    request.authToken = token;

    if (!token) {
      request.authUser = null;
      return next();
    }

    const user = await AuthModel.getUserFromToken(token);
    request.authUser = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

export function requireAuth(request, response, next) {
  // Bloquea la accion cuando no hay usuario autenticado en el request.
  if (!request.authUser) {
    return response.status(401).json({
      message: "Debes iniciar sesion para realizar esta accion"
    });
  }

  return next();
}
