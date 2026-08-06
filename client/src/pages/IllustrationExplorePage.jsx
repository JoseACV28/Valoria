// Galeria principal de ilustraciones.
// Primera implementacion real de la vertical visual de Valoria.
import { useEffect, useMemo, useState } from "react";
import { fetchIllustrations } from "../api/illustrationApi";
import { AppShell } from "../components/layout/AppShell";
import { Navbar } from "../components/layout/Navbar";
import styles from "../styles/IllustrationExplorePage.module.css";

export function IllustrationExplorePage({
  auth,
  navFilters,
  onNavigate,
  onOpenIllustration
}) {
  const [illustrations, setIllustrations] = useState([]);
  const [status, setStatus] = useState("loading");
  const { selectedCategory, storySearchQuery, writerSearchQuery } = navFilters;

  useEffect(() => {
    let active = true;

    async function loadIllustrations() {
      try {
        const data = await fetchIllustrations();
        if (active) {
          setIllustrations(data.illustrations || []);
          setStatus("ready");
        }
      } catch {
        if (active) {
          setIllustrations([]);
          setStatus("empty");
        }
      }
    }

    loadIllustrations();

    return () => {
      active = false;
    };
  }, []);

  const filteredIllustrations = useMemo(() => {
    const storyNeedle = storySearchQuery.trim().toLowerCase();
    const writerNeedle = writerSearchQuery.trim().toLowerCase();

    return illustrations.filter((illustration) => {
      const categories = illustration.categories || [];
      const tags = illustration.tags || [];
      const searchable = [
        illustration.title,
        illustration.description,
        illustration.author,
        ...categories,
        ...tags
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesCategory = selectedCategory
        ? categories.includes(selectedCategory)
        : true;
      const matchesStoryQuery = storyNeedle ? searchable.includes(storyNeedle) : true;
      const matchesWriter = writerNeedle
        ? String(illustration.author || "").toLowerCase().includes(writerNeedle)
        : true;

      return matchesCategory && matchesStoryQuery && matchesWriter;
    });
  }, [illustrations, selectedCategory, storySearchQuery, writerSearchQuery]);

  return (
    <AppShell auth={auth} currentView="illustrations" onNavigate={onNavigate}>
      <main className={styles.page}>
        <Navbar auth={auth} currentView="illustrations" {...navFilters} onNavigate={onNavigate} />

        <section className={styles.hero}>
          <span>Ilustraciones</span>
          <h1>Explora piezas visuales, series y portafolios creativos</h1>
          <p>
            Esta galeria convive con las historias de Valoria y abre espacio para
            ilustradores, portadas, fanart y colecciones visuales.
          </p>
        </section>

        <section className={styles.visualToolbar}>
          <div>
            <span>Exploracion visual</span>
            <strong>{filteredIllustrations.length} piezas visibles ahora</strong>
          </div>
          <p>
            Esta vista prioriza el descubrimiento de imagenes y mantiene la grilla
            clasica anterior como fallback en el CSS por si quieres volver atras.
          </p>
        </section>

        <section className={styles.visualGrid}>
          {status === "loading" ? (
            <article className={styles.emptyCard}>
              <strong>Cargando ilustraciones...</strong>
              <p>Estamos preparando la primera vitrina visual de Valoria.</p>
            </article>
          ) : null}

          {status !== "loading" && filteredIllustrations.length === 0 ? (
            <article className={styles.emptyCard}>
              <strong>Aun no hay ilustraciones para este filtro.</strong>
              <p>
                Cuando ejecutes el SQL y empieces a poblar esta vertical, apareceran
                aqui en formato galeria.
              </p>
            </article>
          ) : null}

          {filteredIllustrations.map((illustration) => (
            <article key={illustration.id} className={styles.visualCard}>
              <button
                className={styles.visualButton}
                onClick={() => onOpenIllustration?.(illustration)}
                type="button"
              >
                <div className={styles.visualImageWrap}>
                  <img src={illustration.coverUrl} alt={illustration.title} />
                  <div className={styles.visualOverlay}>
                    <button
                      className={styles.visualAuthor}
                      onClick={(event) => {
                        event.stopPropagation();
                        illustration.authorId
                          ? onNavigate("creator-profile", { profileId: illustration.authorId })
                          : null;
                      }}
                      type="button"
                    >
                      {illustration.author}
                    </button>
                  </div>
                </div>
                <div className={styles.visualMeta}>
                  <div className={styles.metaRow}>
                    <span>{illustration.likesCount} me gusta</span>
                    <span>{illustration.commentsCount} comentarios</span>
                  </div>
                  <div className={styles.tagRow}>
                    {(illustration.categories || []).slice(0, 2).map((category) => (
                      <span key={`${illustration.id}-${category}`}>{category}</span>
                    ))}
                  </div>
                </div>
              </button>
            </article>
          ))}
        </section>
      </main>
    </AppShell>
  );
}
