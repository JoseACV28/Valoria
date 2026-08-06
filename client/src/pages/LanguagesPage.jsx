// Vista publica de idiomas disponibles o proyectados para la plataforma.
// Funciona como pagina informativa mientras Valoria crece a una comunidad multilenguaje.
import { AppShell } from "../components/layout/AppShell";
import { Navbar } from "../components/layout/Navbar";
import styles from "../styles/DirectoryPage.module.css";

// Lista editorial simple que comunica disponibilidad actual y expansion futura.
const languages = [
  { name: "Espanol", status: "Activo", note: "Idioma principal de la comunidad en esta version." },
  { name: "English", status: "Disponible", note: "Ideal para historias internacionales y perfiles bilingues." },
  { name: "Portugues", status: "Disponible", note: "Pensado para ampliar lectura social en Latinoamerica." },
  { name: "Frances", status: "Exploracion", note: "Preparado para futuras bibliotecas curadas por idioma." },
  { name: "Italiano", status: "Exploracion", note: "Listo para ampliar filtros editoriales y categorias." },
  { name: "Aleman", status: "Exploracion", note: "Reservado para futuras expansiones de la plataforma." }
];

export function LanguagesPage({ auth, navFilters, onNavigate }) {
  return (
    <AppShell auth={auth} currentView="languages" onNavigate={onNavigate}>
      <main className={styles.page}>
        <Navbar auth={auth} currentView="languages" {...navFilters} onNavigate={onNavigate} />

        <section className={styles.hero}>
          <span>Idiomas</span>
          <h1>Idiomas disponibles en Valoria</h1>
          <p>La plataforma esta pensada para crecer como biblioteca social multilenguaje.</p>
        </section>

        <section className={styles.section}>
          <div className={styles.languageGrid}>
            {languages.map((language) => (
              <article key={language.name} className={styles.languageCard}>
                <strong>{language.name}</strong>
                <small>{language.status}</small>
                <p>{language.note}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </AppShell>
  );
}
