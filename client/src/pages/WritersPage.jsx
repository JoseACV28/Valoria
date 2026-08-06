// Directorio publico de escritores.
// Recorre las historias disponibles, agrupa autores y permite encontrarlos por nombre.
import { useEffect, useMemo, useState } from "react";
import { fetchStories } from "../api/storyApi";
import { AppShell } from "../components/layout/AppShell";
import { Navbar } from "../components/layout/Navbar";
import { fallbackStories } from "../data/fallbackStories";
import styles from "../styles/DirectoryPage.module.css";

export function WritersPage({ auth, navFilters, onNavigate }) {
  const [stories, setStories] = useState(fallbackStories);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;

    async function loadStories() {
      try {
        const data = await fetchStories();
        if (active) {
          setStories(data.stories || fallbackStories);
        }
      } catch {}
    }

    loadStories();
    return () => {
      active = false;
    };
  }, []);

  const writers = useMemo(() => {
    // Cada escritor se sintetiza en una sola tarjeta con conteo de historias y lecturas acumuladas.
    const map = new Map();

    for (const story of stories) {
      const key =
        story.authorId ||
        story.author_id ||
        story.profileId ||
        story.profile_id ||
        story.author;

      if (!key) {
        continue;
      }

      const current = map.get(key) || {
        id: story.authorId || story.author_id || story.profileId || story.profile_id || "",
        name: story.author || "Creador de Valoria",
        avatar: story.authorAvatarUrl || story.author_avatar_url || "",
        stories: 0,
        reads: 0
      };

      current.stories += 1;
      current.reads += Number(story.readsCount ?? story.reads_count ?? story.reads ?? 0) || 0;

      if (!current.avatar) {
        current.avatar = story.authorAvatarUrl || story.author_avatar_url || "";
      }

      map.set(key, current);
    }

    return Array.from(map.values())
      .sort((left, right) => right.stories - left.stories || right.reads - left.reads)
      .filter((writer) =>
        writer.name.toLowerCase().includes(query.trim().toLowerCase())
      );
  }, [query, stories]);

  return (
    <AppShell auth={auth} currentView="writers" onNavigate={onNavigate}>
      <main className={styles.page}>
        <Navbar auth={auth} currentView="writers" {...navFilters} onNavigate={onNavigate} />

        <section className={styles.hero}>
          <span>Directorio</span>
          <h1>Escritores registrados</h1>
          <p>Busca creadores por nombre y entra a sus perfiles publicos dentro de Valoria.</p>
        </section>

        <section className={styles.section}>
          <div className={styles.searchBar}>
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar escritor por nombre"
              type="text"
              value={query}
            />
          </div>

          <div className={styles.grid}>
            {writers.map((writer) => (
              <button
                key={`${writer.id}-${writer.name}`}
                className={styles.writerCard}
                onClick={() =>
                  writer.id
                    ? onNavigate("creator-profile", { profileId: writer.id })
                    : undefined
                }
                type="button"
              >
                <div className={styles.writerAvatar}>
                  {writer.avatar ? (
                    <img alt={writer.name} src={writer.avatar} />
                  ) : (
                    writer.name.slice(0, 1)
                  )}
                </div>
                <strong>{writer.name}</strong>
                <span>{writer.stories} historias publicadas</span>
              </button>
            ))}
          </div>
        </section>
      </main>
    </AppShell>
  );
}
