import {ActivityState} from '../components/common/ActivityState';
import { ui } from "../i18n/runtime.js";
// Directorio publico de ilustradores.
// Agrupa autores a partir de las ilustraciones publicadas y permite buscarlos por nombre.
import { useEffect, useMemo, useState } from "react";
import { fetchIllustrations } from "../api/illustrationApi";
import { AppShell } from "../components/layout/AppShell";
import { Navbar } from "../components/layout/Navbar";
import styles from "../styles/DirectoryPage.module.css";

export function IllustratorsPage({ auth, navFilters, onNavigate }) {
  const [illustrations, setIllustrations] = useState([]);

  const [status,setStatus]=useState('loading'),[retry,setRetry]=useState(0);
  useEffect(() => {
    setStatus('loading');
    let active = true;

    async function loadIllustrations() {
      try {
        const data = await fetchIllustrations();
        if (active) {
          setIllustrations(data.illustrations || []);setStatus('ready');
        }
      } catch {if(active)setStatus('error');}
    }

    loadIllustrations();
    return () => {
      active = false;
    };
  }, [retry]);

  const illustrators = useMemo(() => {
    // Se colapsan varias ilustraciones del mismo perfil en una sola tarjeta de directorio.
    const map = new Map();

    for (const illustration of illustrations) {
      const key =
        illustration.authorId ||
        illustration.author_id ||
        illustration.profileId ||
        illustration.profile_id ||
        illustration.author;

      if (!key) {
        continue;
      }

      const current = map.get(key) || {
        id:
          illustration.authorId ||
          illustration.author_id ||
          illustration.profileId ||
          illustration.profile_id ||
          "",
        name: illustration.author || "Ilustrador de Valoria",
        avatar:
          illustration.authorAvatarUrl || illustration.author_avatar_url || "",
        illustrations: 0,
        views: 0
      };

      current.illustrations += 1;
      current.views +=
        Number(
          illustration.viewsCount ??
            illustration.views_count ??
            illustration.views ??
            0
        ) || 0;

      if (!current.avatar) {
        current.avatar =
          illustration.authorAvatarUrl || illustration.author_avatar_url || "";
      }

      map.set(key, current);
    }

    return Array.from(map.values())
      .sort(
        (left, right) =>
          right.illustrations - left.illustrations || right.views - left.views
      );
  }, [illustrations]);

  return (
    <AppShell auth={auth} currentView="illustrators" onNavigate={onNavigate}>
      <main className={styles.page}>
        <Navbar
          auth={auth}
          currentView="illustrators"
          {...navFilters}
          onNavigate={onNavigate}
        />

        <section className={styles.hero}>
          <span>{ui("Directorio")}</span>
          <h1>{ui("Ilustradores con obras publicadas")}</h1>
          <p>{ui(" Usa el buscador superior para encontrar ilustradores por nombre y entrar a sus perfiles públicos. ")}</p>
        </section>

        <section className={styles.section}>

          {status==='loading'&&<ActivityState kind="loading"/>}{status==='error'&&<ActivityState kind="error" action="Reintentar" onAction={()=>setRetry(x=>x+1)}/>}{status==='ready'&&!illustrators.length&&<ActivityState title="Todavía no hay contenido" action="Explorar obras" onAction={()=>onNavigate('home')}/>}
          <div className={styles.grid}>
            {illustrators.map((illustrator) => (
              <button
                key={`${illustrator.id}-${illustrator.name}`}
                className={styles.writerCard}
                onClick={() =>
                  illustrator.id
                    ? onNavigate("creator-profile", {
                        profileId: illustrator.id
                      })
                    : undefined
                }
                type="button"
              >
                <div className={styles.writerAvatar}>
                  {illustrator.avatar ? (
                    <img alt={illustrator.name} src={illustrator.avatar} />
                  ) : (
                    illustrator.name.slice(0, 1)
                  )}
                </div>
                <strong>{illustrator.name}</strong>
                <span>{illustrator.illustrations}{ui(" ilustraciones publicadas")}</span>
              </button>
            ))}
          </div>
        </section>
      </main>
    </AppShell>
  );
}
