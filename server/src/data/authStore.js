// Almacen en memoria para modo local sin Supabase Auth.
// Sirve para pruebas rapidas de registro/login durante desarrollo.
import { createHash, randomUUID } from "node:crypto";

function hashPassword(value) {
  // Genera una huella simple para el modo demo/local del proyecto.
  return createHash("sha256").update(value).digest("hex");
}

const defaultUserId = randomUUID();

export const demoUsers = [
  {
    id: defaultUserId,
    email: "demo@histopad.app",
    passwordHash: hashPassword("demo1234"),
    displayName: "Demo Writer"
  }
];

export const demoSessions = new Map();

export function comparePassword(password, passwordHash) {
  // Compara una contrasena candidata con el hash almacenado.
  return hashPassword(password) === passwordHash;
}

export function buildPasswordHash(password) {
  // Crea el hash que se persiste al registrar usuarios de prueba.
  return hashPassword(password);
}
