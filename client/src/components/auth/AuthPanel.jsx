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
      await auth.login(loginForm);
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
          <span>Cuenta</span>
          <h2>Ya tienes la sesion activa</h2>
        </div>
        <div className={styles.accountCard}>
          <div>
            <strong>{auth.user?.displayName}</strong>
            <p>{auth.user?.email}</p>
          </div>
          <button onClick={auth.logout} type="button">
            Cerrar sesion
          </button>
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
          >
            Login
          </button>
          <button
            className={mode === "register" ? styles.active : ""}
            onClick={() => setMode("register")}
            type="button"
          >
            Registro
          </button>
        </div>
      ) : null}

      {mode === "login" ? (
        <>
          <button
            className={styles.googleButton}
            disabled={loading}
            onClick={handleGoogleLogin}
            type="button"
          >
            {loading ? "Abriendo Google..." : googleLabel}
          </button>

          <div className={styles.divider}>
            <span>o entra con correo</span>
          </div>

          <form className={styles.form} onSubmit={handleLogin}>
            <label>
              <span>Correo</span>
              <input
                type="email"
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
              <span>Contrasena</span>
              <input
                type="password"
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
              {loading ? "Entrando..." : "Iniciar sesion"}
            </button>
          </form>
        </>
      ) : (
        <>
          <button
            className={styles.googleButton}
            disabled={loading}
            onClick={handleGoogleLogin}
            type="button"
          >
            {loading ? "Abriendo Google..." : googleLabel}
          </button>

          <div className={styles.divider}>
            <span>o crea tu cuenta con correo</span>
          </div>

          <form className={styles.form} onSubmit={handleRegister}>
            <label>
              <span>Nombre visible</span>
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
              <span>Correo</span>
              <input
                type="email"
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
              <span>Contrasena</span>
              <input
                type="password"
                minLength="6"
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
              {loading ? "Creando..." : "Crear cuenta"}
            </button>
          </form>
        </>
      )}

      {message ? <p className={styles.message}>{message}</p> : null}
      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </section>
  );
}
