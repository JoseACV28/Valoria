// Inicializacion de clientes Supabase.
// Se separa cliente admin y cliente publico para datos, storage y auth.
import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

const hasAdminConfig = Boolean(
  env.supabaseUrl && env.supabaseServiceRoleKey
);

const hasPublicConfig = Boolean(env.supabaseUrl && env.supabaseAnonKey);

export const supabaseAdmin = hasAdminConfig
  ? createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
  : null;

export const supabasePublic = hasPublicConfig
  ? createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
  : null;

export function isSupabaseEnabled() {
  // Indica si la capa principal de datos/storage puede operar con Supabase.
  return Boolean(supabaseAdmin);
}

export function isSupabaseAuthEnabled() {
  // Indica si la app tambien puede delegar autenticacion en Supabase.
  return Boolean(supabasePublic);
}
