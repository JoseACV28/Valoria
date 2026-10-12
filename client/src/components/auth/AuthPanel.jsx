import { ui } from "../../i18n/runtime.js";
// Panel reutilizable de autenticacion.
// Puede funcionar como login desplegable o como layout dedicado de registro.
import { useEffect, useState } from "react";
import styles from "../../styles/AuthPanel.module.css";

const initialRegister = {
  displayName: "",
  email: "",
  password: ""
};

const initialLogin = {
  email: "",
  password: ""
};

export function AuthPanel({
  auth,
  defaultMode = "login",
  showSwitcher = true,
  variant = "default",
  eyebrow = "Acceso",
  title = "Registro y login listos",
  description = "Crea una cuenta para publicar historias, capitulos e imagenes.",
  googleLabel = "Continuar con Google",
  footer,
  onSuccessfulAuth
}) {
  const localQa = import.meta.env.VITE_QA_ENV === "qa-local";
  const [mode, setMode] = useState(defaultMode);
  const [registerForm, setRegisterForm] = useState(initialRegister);
  const [loginForm, setLoginForm] = useState(initialLogin);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMode(defaultMode);
    setMessage("");
  }, [defaultMode]);

  async function handleRegister(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      await auth.register(registerForm);
      setRegisterForm(initialRegister);
      setMessage("Cuenta creada y sesion iniciada.");
      onSuccessfulAuth?.("register");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      await auth.login({...loginForm,email:loginForm.email.trim()});
      setLoginForm(initialLogin);
      setMessage("Sesion iniciada.");
      onSuccessfulAuth?.("login");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setLoading(true);
    setMessage("");

    try {
      await auth.loginWithGoogle();
    } catch (error) {
      setMessage(error.message);
      setLoading(false);
    }
  }

  if (auth.isAuthenticated) {
    return (
      <section
        className={`${styles.panel} ${variant === "drawer" ? styles.drawerPanel : ""}`}
      >
        <div className={styles.header}>
          <span>{ui("Cuenta")}</span>
          <h2>{ui("Ya tienes la sesion activa")}</h2>
        </div>
        <div className={styles.accountCard}>
          <div>
            <strong>{auth.user?.displayName}</strong>
            <p>{auth.user?.email}</p>
          </div>
          <button onClick={auth.logout} type="button">{ui(" Cerrar sesion ")}</button>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`${styles.panel} ${variant === "drawer" ? styles.drawerPanel : ""}`}
    >
      <div className={styles.header}>
        <div>
          <span>{eyebrow}</span>
          <h2>{title}</h2>
        </div>
        <p>{description}</p>
      </div>

      {showSwitcher ? (
        <div className={styles.switcher}>
          <button
            className={mode === "login" ? styles.active : ""}
            onClick={() => setMode("login")}
            type="button"
          >{ui(" Login ")}</button>
          <button
            className={mode === "register" ? styles.active : ""}
            onClick={() => setMode("register")}
            type="button"
          >{ui(" Registro ")}</button>
        </div>
      ) : null}

      {message ? <p className={styles.message} role="alert">{ui(message)}</p> : null}
      {localQa && <div className={styles.qaAccess}><p>{ui("Esta copia usa cuentas ficticias. Google no está disponible.")}</p>{mode === "login" && <button type="button" disabled={loading} onClick={()=>setLoginForm({email:"demo@histopad.app",password:"demo1234"})}>{ui("Usar cuenta de prueba")}</button>}</div>}

      {mode === "login" ? (
        <>
          {!localQa && <button
            className={styles.googleButton}
            disabled={loading}
            onClick={handleGoogleLogin}
            type="button"
          >
            {loading ? ui("Abriendo Google...") : googleLabel}
          </button>}

          {!localQa && <div className={styles.divider}>
            <span>{ui("o entra con correo")}</span>
          </div>}

          <form className={styles.form} onSubmit={handleLogin}>
            <label>
              <span>{ui("Correo")}</span>
              <input
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                value={loginForm.email}
                onChange={(event) =>
                  setLoginForm((current) => ({
                    ...current,
                    email: event.target.value
                  }))
                }
                required
              />
            </label>
            <label>
              <span>{ui("Contrasena")}</span>
              <input
                type="password"
                autoComplete="current-password"
                value={loginForm.password}
                onChange={(event) =>
                  setLoginForm((current) => ({
                    ...current,
                    password: event.target.value
                  }))
                }
                required
              />
            </label>
            <button disabled={loading} type="submit">
              {loading ? ui("Entrando...") : ui("Iniciar sesion")}
            </button>
          </form>
          <a href="#/forgot-password">{ui('¿Olvidaste tu contraseña?')}</a>
        </>
      ) : (
        <>
          {!localQa && <button
            className={styles.googleButton}
            disabled={loading}
            onClick={handleGoogleLogin}
            type="button"
          >
            {loading ? ui("Abriendo Google...") : googleLabel}
          </button>}

          {!localQa && <div className={styles.divider}>
            <span>{ui("o crea tu cuenta con correo")}</span>
          </div>}

          <form className={styles.form} onSubmit={handleRegister}>
            <label>
              <span>{ui("Nombre visible")}</span>
              <input
                value={registerForm.displayName}
                onChange={(event) =>
                  setRegisterForm((current) => ({
                    ...current,
                    displayName: event.target.value
                  }))
                }
                required
              />
            </label>
            <label>
              <span>{ui("Correo")}</span>
              <input
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                value={registerForm.email}
                onChange={(event) =>
                  setRegisterForm((current) => ({
                    ...current,
                    email: event.target.value
                  }))
                }
                required
              />
            </label>
            <label>
              <span>{ui("Contrasena")}</span>
              <input
                type="password"
                minLength="15"
                maxLength="128"
                placeholder={ui("Al menos 15 caracteres")}
                autoComplete="new-password"
                value={registerForm.password}
                onChange={(event) =>
                  setRegisterForm((current) => ({
                    ...current,
                    password: event.target.value
                  }))
                }
                required
              />
            </label>
            <button disabled={loading} type="submit">
              {loading ? ui("Creando...") : ui("Crear cuenta")}
            </button>
          </form>
        </>
      )}

      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </section>
  );
}
