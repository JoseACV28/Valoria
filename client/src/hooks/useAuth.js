// Hook de autenticacion del cliente.
// Guarda la sesion en localStorage y expone login, registro y logout.
import { useEffect, useState } from "react";
import { fetchCurrentUser, loginUser, registerUser, logoutUser } from "../api/authApi";
import { syncApiSession, closeAuthSession } from '../utils/authSession';
import { getSupabaseBrowserClient } from "../lib/supabaseClient";
import {rememberRecovery,hasRecovery,clearRecovery,readCallbackSession} from '../utils/passwordRecovery.js';

const STORAGE_KEY = "valoria-auth";
const AUTH_PROFILE_UPDATED_EVENT = "valoria-auth-profile-updated";

function readStoredAuth() {
  // Reconstruye la sesion persistida para evitar pedir login en cada recarga.
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistAuth(auth) {
  // Guarda el estado actual de autenticacion en localStorage.
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
}

function clearPersistedAuth() {
  // Borra la sesion local cuando el usuario sale o expira.
  window.localStorage.removeItem(STORAGE_KEY);
}

function normalizeSessionPayload(session, userOverride = null) {
  // Convierte la sesion del backend/Supabase a un formato unico para el cliente.
  const fallbackName =
    session.user?.user_metadata?.display_name ||
    session.user?.user_metadata?.displayName ||
    session.user?.email ||
    "Lectora";

  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresIn: session.expires_in,
    tokenType: session.token_type,
    user: userOverride || {
      id: session.user?.id,
      email: session.user?.email,
      displayName: fallbackName,
      realName:
        session.user?.user_metadata?.real_name ||
        session.user?.user_metadata?.realName ||
        ""
    }
  };
}

export function useAuth() {
  // Orquesta login, registro, logout y sincronizacion de perfil a nivel de aplicacion.
  const [auth, setAuth] = useState(() => readStoredAuth());
  const [status, setStatus] = useState("loading");
  const [recoveryRequired,setRecoveryRequired]=useState(false);

  useEffect(() => {
    let active = true;
    const supabase = getSupabaseBrowserClient();

    async function hydrateFromSession(session) {
      if(active)setRecoveryRequired(hasRecovery(session));
      const fallbackAuth = normalizeSessionPayload(session);

      try {
        const { user } = await fetchCurrentUser(session.access_token);
        const nextAuth = normalizeSessionPayload(session, user);

        if (active) {
          setAuth(nextAuth);
          persistAuth(nextAuth);
          setStatus("authenticated");
        }
      } catch (error) {
        if ([401,403].includes(error.status)) {
          if(active){clearPersistedAuth();setAuth(null);setStatus('guest');}
          return;
        }
        if (active) {
          setAuth(fallbackAuth);
          persistAuth(fallbackAuth);
          setStatus("authenticated");
        }
      }
    }

    async function bootstrapAuth() {
      const stored = readStoredAuth();
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      if (supabase && code) {
        const session=await readCallbackSession(supabase,window.location,window.history);
        if (session) {
          await hydrateFromSession(session);
          return;
        }
      }

      if (stored?.accessToken) {
        try {
          const { user } = await fetchCurrentUser(stored.accessToken);
          const nextAuth = {
            ...stored,
            user
          };

          if (active) {
            setRecoveryRequired(hasRecovery({access_token:stored.accessToken,user}));
            setAuth(nextAuth);
            persistAuth(nextAuth);
            setStatus("authenticated");
          }
          return;
        } catch (error) {
          if(![401,403].includes(error.status)){if(active){setAuth(stored);setStatus("authenticated");}return;}
          clearPersistedAuth();
          if (active) {
            setAuth(null);
          }
        }
      }

      if (supabase) {
        const { data } = await supabase.auth.getSession();

        if (data.session) {
          await hydrateFromSession(data.session);
          return;
        }
      }

      if (active) {
        setStatus("guest");
      }
    }

    bootstrapAuth();

    const subscription = supabase?.auth.onAuthStateChange(async (event, session) => {
      if (!active) {
        return;
      }

      if (event === "SIGNED_OUT") {
        clearRecovery();setRecoveryRequired(false);
        clearPersistedAuth();
        setAuth(null);
        setStatus("guest");
        return;
      }

      if (session) {
        if(event==='PASSWORD_RECOVERY'){rememberRecovery(session);setRecoveryRequired(true);window.location.hash='/reset-password';}
        else if(event==='SIGNED_IN'&&!hasRecovery(session)){clearRecovery();setRecoveryRequired(false);}
        await hydrateFromSession(session);
      }
    });

    return () => {
      active = false;
      subscription?.data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function handleProfileUpdated(event) {
      const profile = event.detail;

      if (!profile) {
        return;
      }

      setAuth((current) => {
        if (!current?.user) {
          return current;
        }

        const nextAuth = {
          ...current,
          user: {
            ...current.user,
            displayName: profile.displayName || current.user.displayName,
            realName: profile.realName ?? current.user.realName ?? "",
            bio: profile.bio ?? current.user.bio ?? "",
            avatarUrl: profile.avatarUrl ?? current.user.avatarUrl ?? "",
            coverUrl: profile.coverUrl ?? current.user.coverUrl ?? ""
          }
        };

        persistAuth(nextAuth);
        return nextAuth;
      });
    }

    window.addEventListener(AUTH_PROFILE_UPDATED_EVENT, handleProfileUpdated);
    return () =>
      window.removeEventListener(AUTH_PROFILE_UPDATED_EVENT, handleProfileUpdated);
  }, []);

  async function register(payload) {
    // Registra un usuario, persiste la sesion y actualiza el estado global.
    const result = await registerUser(payload);
    await syncApiSession(getSupabaseBrowserClient(), result);
    persistAuth(result);
    setAuth(result);
    setStatus("authenticated");
    return result;
  }

  async function login(payload) {
    // Inicia sesion local con correo y contrasena.
    const result = await loginUser(payload);
    await syncApiSession(getSupabaseBrowserClient(), result);
    persistAuth(result);
    setAuth(result);
    setStatus("authenticated");
    return result;
  }

  async function loginWithGoogle() {
    // Dispara el flujo OAuth de Google a traves del cliente de Supabase.
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      throw new Error("Faltan las variables publicas de Supabase en el cliente.");
    }

    setStatus("authenticating");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}${window.location.pathname}`
      }
    });

    if (error) {
      setStatus("guest");
      throw new Error(error.message);
    }
  }

  async function logout() {
    // Cierra la sesion remota y limpia toda persistencia local.
    const supabase = getSupabaseBrowserClient();

    await closeAuthSession(supabase, auth?.accessToken, logoutUser);

    clearPersistedAuth();
    setAuth(null);
    setStatus("guest");
    clearRecovery();setRecoveryRequired(false);
  }

  async function refreshCurrentUser() {
    const client=getSupabaseBrowserClient();
    const session=client?(await client.auth.getSession()).data.session:null;
    const token=session?.access_token||auth?.accessToken;
    if(!token)throw new Error('Inicia sesión de nuevo.');
    const {user}=await fetchCurrentUser(token);
    const next=session?normalizeSessionPayload(session,user):{...auth,user};
    persistAuth(next);setAuth(next);setStatus('authenticated');
    return user;
  }

  return {
    auth,
    token: auth?.accessToken || "",
    user: auth?.user || null,
    isAuthenticated: Boolean(auth?.accessToken),
    status,
    register,
    login,
    loginWithGoogle,
    logout,
    refreshCurrentUser,
    recoveryRequired,
    async clearAfterPasswordChange(){
      const client=getSupabaseBrowserClient();
      await client?.auth.signOut({scope:'local'}).catch(()=>{});
      clearPersistedAuth();clearRecovery();setRecoveryRequired(false);setAuth(null);setStatus('guest');
    },
    updateCurrentUserProfile(profile) {
      window.dispatchEvent(
        new CustomEvent(AUTH_PROFILE_UPDATED_EVENT, {
          detail: profile
        })
      );
    }
  };
}
