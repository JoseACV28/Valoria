// Vista biblioteca; el selector y la restauración del home están en HomePage.jsx.
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { ui } from '../i18n/runtime';
import { fetchStories } from '../api/storyApi';
import { fetchIllustrations } from '../api/illustrationApi';
import { AppShell } from '../components/layout/AppShell';
import { Navbar } from '../components/layout/Navbar';
import { ActivityState } from '../components/common/ActivityState';
import { SiteNotice } from '../components/common/SiteNotice';
import { CreativeChallenge } from '../components/common/CreativeChallenge';
import { EditorialPicks } from '../components/common/EditorialPicks';
import { PersonalizedShelves } from '../components/stories/PersonalizedShelves';
import { LibraryArtShelf } from '../components/stories/LibraryArtShelf';
import { LibraryBookShelf } from '../components/stories/LibraryBookShelf';
import { ContinueReading } from '../components/stories/ContinueReading';
import { categoryLabel } from '../data/categories';
import styles from '../styles/LibraryHome.module.css';
import legacy from '../styles/HomePage.module.css';
const AuthPanel = lazy(() => import('../components/auth/AuthPanel').then(x => ({ default: x.AuthPanel })));

export function LibraryHomePage({ auth, currentView, navFilters, onNavigate, onOpenStory, onOpenIllustration, showLoginPanel, homeSection = '', homeSectionRequestKey = 0 }) {
  const [stories, setStories] = useState([]);
  const [illustrations, setIllustrations] = useState([]);
  const [status, setStatus] = useState('loading');
  const [retry, setRetry] = useState(0);
  const [illustrationError, setIllustrationError] = useState(false);
  useEffect(() => {
    let active = true;
    setStatus('loading');
    Promise.all([fetchStories(auth.token), fetchIllustrations(auth.token).catch(() => null)])
      .then(([books, art]) => { if (active) { setStories(books.stories || []); setIllustrations(art?.illustrations || []); setIllustrationError(!art); setStatus('ready'); } })
      .catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, [auth.token, retry]);
  useEffect(() => {
    if (!homeSection || status !== 'ready') return;
    document.getElementById(homeSection)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }, [homeSection, homeSectionRequestKey, status]);
  const selection = useMemo(() => [...stories].sort((a, b) => Number(b.is_featured || 0) - Number(a.is_featured || 0) || Number(b.reads_count || 0) - Number(a.reads_count || 0)).slice(0, 3), [stories]);
  const recent = useMemo(() => [...stories].sort((a, b) => (Date.parse(b.publishedAt || b.published_at || b.createdAt || b.created_at) || 0) - (Date.parse(a.publishedAt || a.published_at || a.createdAt || a.created_at) || 0)).slice(0, 5), [stories]);
  const artSelection = useMemo(() => [...illustrations].sort((a,b) => Number(b.isFeatured) - Number(a.isFeatured) || Number(b.likesCount || 0) - Number(a.likesCount || 0)).slice(0,3), [illustrations]);
  const recentArt = useMemo(() => [...illustrations].sort((a,b) => (Date.parse(b.publishedAt || b.createdAt) || 0) - (Date.parse(a.publishedAt || a.createdAt) || 0)).slice(0,5), [illustrations]);
  const genres = [...new Set(stories.map(story => story.category).filter(Boolean))].slice(0, 4);
  const discover = (category, scope='all') => navFilters.onSearchSubmit?.('', scope, '', category ? { category } : {});
  return <AppShell auth={auth} currentView={currentView} onNavigate={onNavigate} className={styles.shell} homeBrand>
    <main className={styles.page}>
      <Navbar variant="editorial" auth={auth} currentView={currentView} {...navFilters} onNavigate={onNavigate} />
      <div id="auth" /><SiteNotice />
      {showLoginPanel && !auth.isAuthenticated && <>
        <button type="button" className={legacy.authBackdrop} aria-label={ui('Cerrar login')} onClick={() => onNavigate('home')} />
        <section className={legacy.authDock}><Suspense fallback={<ActivityState kind="loading" />}><AuthPanel auth={auth} defaultMode="login" title={ui('Inicia sesion en Valoria')} description="Entra para comentar, guardar lecturas y abrir tu espacio de creador." variant="drawer" showSwitcher={false} onSuccessfulAuth={() => onNavigate('home')} footer={<button type="button" className={legacy.inlineLink} onClick={() => onNavigate('register')}>{ui('Crear una cuenta nueva')}</button>} /></Suspense></section>
      </>}
      <header className={styles.intro}>
        <p>{auth.user ? ui('Hola, {0}', [auth.user.displayName || auth.user.username || '']) : ui('Bienvenido a Valoria')}</p>
        <h1>{ui('Tu próxima inspiración')}</h1>
        <p className={styles.introNote}>{ui('Historias para leer. Ilustraciones para descubrir. Un espacio para crear.')}</p>
      </header>
      <div className={styles.flow}>
        <ContinueReading auth={auth} onNavigate={onNavigate} variant="library" stories={stories} />
        {status === 'loading' ? <ActivityState kind="loading" title="Cargando historias e ilustraciones..." /> : status === 'error' ? <ActivityState kind="error" message="Tu contenido guardado se conserva. Vuelve a intentarlo." action="Reintentar" onAction={() => setRetry(x => x + 1)} /> : <>
          <div className={styles.featureGrid}>
            <div id="series-destacadas"><LibraryBookShelf section={{title:'Historias para descubrir',stories:selection}} onOpenStory={onOpenStory} onOpenAuthor={id=>onNavigate('creator-profile',{profileId:id})}>
              <button type="button" className={styles.textLink} onClick={()=>discover('','stories')}>{ui('Ver historias')} →</button>
            </LibraryBookShelf></div>
            <LibraryArtShelf title="Ilustraciones para descubrir" works={artSelection} onOpenIllustration={onOpenIllustration} onNavigate={onNavigate}>
              <button type="button" className={styles.textLink+' '+styles.artPath} onClick={()=>onNavigate('illustrations')}>{ui('Ver ilustraciones')} →</button>
            </LibraryArtShelf>
          </div>
          {!stories.length && <ActivityState kind="empty" title="Todavía no hay historias publicadas." />}
          {!illustrations.length && !illustrationError && <ActivityState kind="empty" title="Todavía no hay ilustraciones publicadas." />}
          <section className={styles.exploreKinds} aria-label={ui('Categorías')}>
            <div><strong>{ui('Géneros literarios')}</strong><nav className={styles.genres}>{genres.map(category=><button key={category} type="button" onClick={()=>discover(category,'stories')}>{ui(categoryLabel(category))}</button>)}</nav></div>
            <div><strong>{ui('Categorías visuales')}</strong><nav className={styles.genres}>{[...new Set(illustrations.flatMap(work=>work.categories||[]))].slice(0,4).map(category=><button key={category} type="button" onClick={()=>discover(category,'illustrations')}>{ui(categoryLabel(category))}</button>)}</nav></div>
          </section>
          <LibraryBookShelf section={{title:'Nuevas historias',subtitle:'Las últimas publicaciones de nuestra comunidad de escritores.',stories:recent}} onOpenStory={onOpenStory} onOpenAuthor={id=>onNavigate('creator-profile',{profileId:id})}><button type="button" className={styles.textLink} onClick={()=>navFilters.onSearchSubmit?.('','stories','',{sort:'recent'})}>{ui('Ver todas')} →</button></LibraryBookShelf>
          <LibraryArtShelf title="Nuevas ilustraciones" subtitle="Las últimas obras de nuestra comunidad de ilustradores." works={recentArt} onOpenIllustration={onOpenIllustration} onNavigate={onNavigate}><button type="button" className={styles.textLink+' '+styles.artPath} onClick={()=>navFilters.onSearchSubmit?.('','illustrations','',{sort:'recent'})}>{ui('Ver todas')} →</button></LibraryArtShelf>
          <div className={styles.personalized}><PersonalizedShelves variant="library" auth={auth} stories={stories} onOpenStory={onOpenStory} onNavigate={onNavigate} /></div>
          {illustrationError && <ActivityState kind="error" message="No se pudieron cargar las ilustraciones." action="Reintentar" onAction={() => setRetry(x => x + 1)} />}
          <div className={styles.extras}><EditorialPicks onNavigate={onNavigate} /><CreativeChallenge onNavigate={onNavigate} /></div>
          <section id="comunidad" className={styles.community}><div><h2>{ui('Encuentra tu comunidad creativa')}</h2><p>{ui('Comparte tus avances, conversa con otros creadores y descubre nuevas voces.')}</p></div><div className={styles.sectionLinks}><button type="button" className={styles.textLink} onClick={() => onNavigate('writers')}>{ui('Escritores')} →</button><button type="button" className={styles.textLink+' '+styles.artPath} onClick={() => onNavigate('illustrators')}>{ui('Ilustradores')} →</button></div></section>
        </>}
      </div>
    </main>
  </AppShell>;
}






