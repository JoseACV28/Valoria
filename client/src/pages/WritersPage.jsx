import {ActivityState} from '../components/common/ActivityState';
import { ui } from "../i18n/runtime.js";
// Directorio publico de escritores.
// Recorre las historias disponibles, agrupa autores y permite encontrarlos por nombre.
import { useEffect, useMemo, useState } from "react";
import { fetchStories } from "../api/storyApi";
import { AppShell } from "../components/layout/AppShell";
import { Navbar } from "../components/layout/Navbar";

import styles from "../styles/DirectoryPage.module.css";

export function WritersPage({ auth, navFilters, onNavigate }) {
  const [stories, setStories] = useState([]);

  const [status,setStatus]=useState('loading'),[retry,setRetry]=useState(0);
  useEffect(() => {
    setStatus('loading');
    let active = true;

    async function loadStories() {
      try {
        const data = await fetchStories();
        if (active) {
          setStories(data.stories || []);setStatus('ready');
        }
      } catch {if(active)setStatus('error');}
    }

    loadStories();
    return () => {
      active = false;
    };
  }, [retry]);

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
      .sort((left, right) => right.stories - left.stories || right.reads - left.reads);
  }, [stories]);

  return (
    <AppShell auth={auth} currentView="writers" onNavigate={onNavigate}>
      <main className={styles.page}>
        <Navbar auth={auth} currentView="writers" {...navFilters} onNavigate={onNavigate} />

        <section className={styles.hero}>
          <span>{ui("Directorio")}</span>
          <h1>{ui("Escritores con obras publicadas")}</h1>
          <p>{ui("Usa el buscador superior para encontrar escritores por nombre y entrar a sus perfiles públicos.")}</p>
        </section>

        <section className={styles.section}>

          {status==='loading'&&<ActivityState kind="loading"/>}{status==='error'&&<ActivityState kind="error" action="Reintentar" onAction={()=>setRetry(x=>x+1)}/>}{status==='ready'&&!writers.length&&<ActivityState title="Todavía no hay contenido" action="Explorar obras" onAction={()=>onNavigate('home')}/>}
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
                <span>{writer.stories}{ui(" historias publicadas")}</span>
              </button>
            ))}
          </div>
        </section>
      </main>
    </AppShell>
  );
}
