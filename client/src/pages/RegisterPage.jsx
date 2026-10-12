import { ui } from "../i18n/runtime.js";
// Vista dedicada de registro.
// Separa la creacion de cuenta del home para que el acceso del lector quede mas limpio.
import { AuthPanel } from "../components/auth/AuthPanel";
import { AppShell } from "../components/layout/AppShell";
import { Navbar } from "../components/layout/Navbar";
import styles from "../styles/RegisterPage.module.css";

export function RegisterPage({ auth, navFilters, onNavigate }) {
  return (
    <AppShell auth={auth} currentView="register" onNavigate={onNavigate}>
      <main className={styles.page}>
        <Navbar auth={auth} currentView="register" {...navFilters} onNavigate={onNavigate} />

      <section className={styles.layout}>
        <article className={styles.intro}>
          <span>{ui("Registro")}</span>
          <h1>{ui("Crea tu lugar en Valoria")}</h1>
          <p>{ui(" Abre tu cuenta para leer, comentar, guardar historias y empezar a publicar cuando quieras dar el salto al panel de creador. ")}</p>
        </article>

        <AuthPanel
          auth={auth}
          defaultMode="register"
          description="Crea tu cuenta con correo o continua con Google."
          footer={
            <button
              className={styles.inlineLink}
              onClick={() => onNavigate("login")}
              type="button"
            >{" Ya tengo cuenta, quiero iniciar sesion "}</button>
          }
          googleLabel="Registrarme con Google"
          onSuccessfulAuth={() => onNavigate("home")}
          showSwitcher={false}
          title={ui("Crea tu cuenta de lectura")}
        />
        </section>
      </main>
    </AppShell>
  );
}
