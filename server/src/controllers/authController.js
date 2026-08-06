// Controlador HTTP de autenticacion.
// Valida payloads y delega en el modelo de auth.
import { AuthModel } from "../models/authModel.js";

export async function register(request, response, next) {
  // Valida el payload de registro y delega la creacion del usuario al modelo.
  try {
    const { email, password, displayName } = request.body;

    if (!email || !password || !displayName) {
      return response.status(400).json({
        message: "email, password y displayName son obligatorios"
      });
    }

    const auth = await AuthModel.register({ email, password, displayName });
    return response.status(201).json(auth);
  } catch (error) {
    return next(error);
  }
}

export async function login(request, response, next) {
  // Valida credenciales y devuelve la sesion del usuario autenticado.
  try {
    const { email, password } = request.body;

    if (!email || !password) {
      return response.status(400).json({
        message: "email y password son obligatorios"
      });
    }

    const auth = await AuthModel.login({ email, password });
    return response.json(auth);
  } catch (error) {
    return next(error);
  }
}

export async function getCurrentUser(request, response) {
  // Responde con el usuario autenticado ya resuelto por middleware.
  if (!request.authUser) {
    return response.status(401).json({
      message: "No autenticado"
    });
  }

  return response.json({ user: request.authUser });
}
