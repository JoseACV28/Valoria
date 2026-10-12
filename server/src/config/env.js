// Lectura centralizada de variables de entorno usadas por el servidor.
import { fileURLToPath } from "node:url";
import path from "node:path";
import { validateProductionConfig } from './security.js';
import {validateQaEnvironment} from './qaEnvironment.js';
import {configureBetaOrigin, validateBetaEnvironment} from './betaEnvironment.js';

configureBetaOrigin();
validateProductionConfig();
validateQaEnvironment(process.env);
validateBetaEnvironment(process.env);

const serverDir = fileURLToPath(new URL("../../", import.meta.url));

export const env = {
  port: Number(process.env.PORT || 4000),
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  supabaseBucket: process.env.SUPABASE_STORAGE_BUCKET || "story-media",
  uploadFallbackDir: process.env.UPLOAD_FALLBACK_DIR || "uploads",
  uploadAbsoluteDir: ['qa-local','staging'].includes(process.env.APP_ENV)?path.resolve(serverDir,'../.codex-qa/uploads'):path.resolve(serverDir, process.env.UPLOAD_FALLBACK_DIR || "uploads")
};
