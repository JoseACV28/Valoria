import {ActivityState} from '../components/common/ActivityState';
import { ui } from "../i18n/runtime.js";
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
  const [collection,setCollection]=useState("");
  const [illustrations, setIllustrations] = useState([]);
  const [status, setStatus] = useState("loading"),[retry,setRetry]=useState(0);
  const { selectedCategory, storySearchQuery, writerSearchQuery } = navFilters;

  useEffect(() => {
    let active = true;

    async function loadIllustrations() {
      setStatus("loading");
      try {
        const data = await fetchIllustrations(auth.token);
        if (active) {
          setIllustrations(data.illustrations || []);
          setStatus("ready");
        }
      } catch {
        if (active) {
          setIllustrations([]);
          setStatus("error");
        }
      }
    }

    loadIllustrations();

    return () => {
      active = false;
    };
  }, [auth.token,retry]);

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

      return matchesCategory && matchesStoryQuery && matchesWriter && (!collection || illustration.collectionName===collection);
    });
  }, [illustrations, selectedCategory, storySearchQuery, writerSearchQuery,collection]);

  return (
    <AppShell auth={auth} currentView="illustrations" onNavigate={onNavigate}>
      <main className={styles.page}>
        <Navbar auth={auth} currentView="illustrations" {...navFilters} onNavigate={onNavigate} />

        <section className={styles.hero}>
          <span>{ui("Ilustraciones")}</span>
          <h1>{ui("Explora piezas visuales, series y portafolios creativos")}</h1>
          <p>{ui(" Esta galeria convive con las historias de Valoria y abre espacio para ilustradores, portadas, fanart y colecciones visuales. ")}</p>
        </section>

        <section className={styles.visualToolbar}>
          <div className={styles.toolbarHeading}>
            <div>
              <span>{ui("Exploración visual")}</span>
              <strong>{status === 'loading' ? ui("Cargando ilustraciones…") : ui("{0} piezas visibles ahora",[filteredIllustrations.length])}</strong>
            </div>
            <p>{ui("Descubre nuevas obras y encuentra tu siguiente inspiración visual.")}</p>
          </div>
          <div className={styles.toolbarFilters}>
            <label className={styles.collectionFilter}>
              <span>{ui("Colección o serie")}</span>
              <select value={collection} disabled={status === 'loading'} onChange={event=>setCollection(event.target.value)}>
                <option value="">{ui("Todas las colecciones")}</option>
                {[...new Set(illustrations.map(item=>item.collectionName).filter(Boolean))].sort().map(name=><option key={name} value={name}>{name}</option>)}
              </select>
            </label>
            {collection && <button className={styles.clearFilter} type="button" onClick={()=>setCollection('')}>{ui("Ver todas las colecciones")}</button>}
          </div>
        </section>

        <section className={styles.visualGrid}>
          {status==='loading'&&<ActivityState kind="loading" title="Cargando ilustraciones..."/>}
          {status==='error'&&<ActivityState kind="error" action="Reintentar" onAction={()=>setRetry(x=>x+1)}/>}
          {status==='ready'&&!filteredIllustrations.length&&<ActivityState title="Aun no hay ilustraciones para este filtro." message="Prueba otra busqueda o vuelve mas tarde para descubrir nuevas obras." action="Ver todas las colecciones" onAction={()=>{setCollection('');onNavigate('illustrations');}}/>}
          {filteredIllustrations.map((illustration) => (
            <article key={illustration.id} className={styles.visualCard}>
              <div className={styles.visualButton}>
                <div className={styles.visualImageWrap}>
                  <button className={styles.imageButton} type="button" aria-label={ui("Abrir ilustración {0}",[illustration.title])} onClick={()=>onOpenIllustration?.(illustration)}><img loading="lazy" src={illustration.coverUrl} alt={illustration.title} /></button>
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
                <div className={styles.visualMeta}><button className={styles.titleButton} type="button" onClick={()=>onOpenIllustration?.(illustration)}>{illustration.title}</button>{illustration.collectionName && <small className={styles.collectionName}>{illustration.collectionName}</small>}
                  <div className={styles.metaRow}>
                    <span>{illustration.likesCount}{ui(" me gusta")}</span>
                    <span>{illustration.commentsCount}{ui(" comentarios")}</span>
                  </div>
                  <div className={styles.tagRow}>
                    {(illustration.categories || []).slice(0, 2).map((category) => (
                      <span key={`${illustration.id}-${category}`}>{ui(category)}</span>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>
      </main>
    </AppShell>
  );
}
