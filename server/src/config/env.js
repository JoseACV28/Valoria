// Lectura centralizada de variables de entorno usadas por el servidor.
export const env = {
  port: Number(process.env.PORT || 4000),
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  supabaseBucket: process.env.SUPABASE_STORAGE_BUCKET || "story-media",
  uploadFallbackDir: process.env.UPLOAD_FALLBACK_DIR || "uploads"
};
