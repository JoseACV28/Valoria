// Controlador HTTP de autenticacion.
// Valida payloads y delega en el modelo de auth.
import { AuthModel } from "../models/authModel.js";

function validCredentials(email, password) {
  return typeof email === 'string' && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    typeof password === 'string' && password.length > 0 && password.length <= 128;
}

export async function register(request, response, next) {
  // Valida el payload de registro y delega la creacion del usuario al modelo.
  try {
    const { email, password, displayName } = request.body;

    if (!validCredentials(email, password) || [...password].length < 15 || typeof displayName !== 'string' || !displayName.trim() || displayName.length > 80) {
      return response.status(400).json({
        message: "Indica un correo válido, una contraseña de 15 a 128 caracteres y un nombre de hasta 80 caracteres."
      });
    }

    const auth = await AuthModel.register({ email: email.trim().toLowerCase(), password, displayName: displayName.trim() });
    return response.status(201).json(auth);
  } catch (error) {
    return next(error);
  }
}

export async function login(request, response, next) {
  // Valida credenciales y devuelve la sesion del usuario autenticado.
  try {
    const { email, password } = request.body;

    if (!validCredentials(email, password)) {
      return response.status(400).json({
        message: "email y password son obligatorios"
      });
    }

    const auth = await AuthModel.login({ email: email.trim().toLowerCase(), password });
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
