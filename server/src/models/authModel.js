// Modelo de autenticacion.
// Encapsula login/registro tanto para Supabase como para fallback local.
import { randomUUID } from "node:crypto";
import {
  buildPasswordHash,
  comparePassword,
  demoSessions,
  demoUsers
} from "../data/authStore.js";
import {
  isSupabaseAuthEnabled,
  isSupabaseEnabled,
  supabaseAdmin,
  supabasePublic
} from "../config/supabase.js";

function buildFallbackSession(user) {
  // Construye una sesion local de respaldo cuando no se usa Supabase Auth.
  const accessToken = randomUUID();
  const session = {
    access_token: accessToken,
    refresh_token: null,
    expires_in: 60 * 60 * 24 * 7,
    token_type: "bearer",
    user: {
      id: user.id,
      email: user.email,
      user_metadata: {
        display_name: user.displayName,
        real_name: user.realName || ""
      }
    }
  };

  demoSessions.set(accessToken, session);
  return session;
}

function normalizeAuthPayload(session) {
  // Traduce la sesion cruda a un payload unico consumido por frontend y middleware.
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresIn: session.expires_in,
    tokenType: session.token_type,
    user: {
      id: session.user.id,
      email: session.user.email,
      displayName:
        session.user.user_metadata?.display_name ||
        session.user.user_metadata?.displayName ||
        session.user.email,
      realName:
        session.user.user_metadata?.real_name ||
        session.user.user_metadata?.realName ||
        "",
      avatarUrl: session.user.user_metadata?.avatar_url || "",
      coverUrl: session.user.user_metadata?.cover_url || ""
    }
  };
}

async function syncProfile(user) {
  // Garantiza que cada usuario autenticado tenga su fila espejo en profiles.
  if (!isSupabaseEnabled()) {
    return;
  }

  const { data: existingProfile, error: existingError } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  const displayName =
    existingProfile?.display_name ||
    user.user_metadata?.display_name ||
    user.user_metadata?.displayName ||
    user.email;

  const profilePayload = {
    id: user.id,
    email: user.email,
    display_name: displayName,
    real_name:
      existingProfile?.real_name ||
      user.user_metadata?.real_name ||
      user.user_metadata?.realName ||
      "",
    bio: existingProfile?.bio || "",
    avatar_url: existingProfile?.avatar_url || user.user_metadata?.avatar_url || "",
    cover_url: existingProfile?.cover_url || user.user_metadata?.cover_url || ""
  };

  let { error } = await supabaseAdmin.from("profiles").upsert(profilePayload, {
    onConflict: "id"
  });

  if (error?.message?.includes("real_name")) {
    const { real_name, ...fallbackPayload } = profilePayload;
    const retry = await supabaseAdmin.from("profiles").upsert(fallbackPayload, {
      onConflict: "id"
    });
    error = retry.error;
  }

  if (error) {
    throw new Error(error.message);
  }
}

export class AuthModel {
  static async register({ email, password, displayName }) {
    // Registra un usuario nuevo en Supabase o en el modo demo local.
    if (!isSupabaseAuthEnabled()) {
      const exists = demoUsers.find((user) => user.email === email);
      if (exists) {
        throw new Error("Ya existe una cuenta con ese correo");
      }

      const user = {
        id: randomUUID(),
        email,
        passwordHash: buildPasswordHash(password),
        displayName,
        realName: ""
      };

      demoUsers.push(user);
      return normalizeAuthPayload(buildFallbackSession(user));
    }

    const { data, error } = await supabasePublic.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName
        }
      }
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.session || !data.user) {
      throw new Error(
        "Registro creado. Revisa la configuracion de confirmacion por correo en Supabase Auth."
      );
    }

    await syncProfile(data.user);
    const payload = normalizeAuthPayload(data.session);
    const currentUser = await this.getUserFromToken(data.session.access_token);
    return {
      ...payload,
      user: currentUser || payload.user
    };
  }

  static async login({ email, password }) {
    // Inicia sesion y sincroniza el perfil publico del usuario.
    if (!isSupabaseAuthEnabled()) {
      const user = demoUsers.find((item) => item.email === email);

      if (!user || !comparePassword(password, user.passwordHash)) {
        throw new Error("Correo o contrasena invalidos");
      }

      return normalizeAuthPayload(buildFallbackSession(user));
    }

    const { data, error } = await supabasePublic.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw new Error(error.message);
    }

    await syncProfile(data.user);
    const payload = normalizeAuthPayload(data.session);
    const currentUser = await this.getUserFromToken(data.session.access_token);
    return {
      ...payload,
      user: currentUser || payload.user
    };
  }

  static async getUserFromToken(token) {
    // Resuelve el usuario autenticado real a partir de un access token.
    if (!token) {
      return null;
    }

    if (!isSupabaseAuthEnabled()) {
      const session = demoSessions.get(token);
      return session ? normalizeAuthPayload(session).user : null;
    }

    const { data, error } = await supabasePublic.auth.getUser(token);

    if (error || !data.user) {
      return null;
    }

    await syncProfile(data.user);

    let profileData = null;

    if (isSupabaseEnabled()) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .maybeSingle();

      profileData = profile;
    }

    return {
      id: data.user.id,
      email: data.user.email,
      displayName:
        profileData?.display_name ||
        data.user.user_metadata?.display_name ||
        data.user.user_metadata?.displayName ||
        data.user.email,
      realName:
        profileData?.real_name ||
        data.user.user_metadata?.real_name ||
        data.user.user_metadata?.realName ||
        "",
      avatarUrl: profileData?.avatar_url || "",
      coverUrl: profileData?.cover_url || "",
      bio: profileData?.bio || ""
    };
  }
}
