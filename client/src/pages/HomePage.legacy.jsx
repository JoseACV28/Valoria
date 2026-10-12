import { CategoryStrip } from '../components/stories/CategoryStrip';
import {lazy,Suspense} from 'react';
import {ActivityState} from '../components/common/ActivityState';
import {CreativeChallenge} from '../components/common/CreativeChallenge';
import {LaunchShelf} from '../components/stories/LaunchShelf';
import {launchCommunity} from '../utils/creativeChallenge';
import { ui } from "../i18n/runtime.js";
import {EditorialPicks} from '../components/common/EditorialPicks';
import { WelcomeGuide } from '../components/common/WelcomeGuide';
import { PersonalizedShelves } from "../components/stories/PersonalizedShelves";
import { SiteNotice } from '../components/common/SiteNotice';
import { ContinueReading } from "../components/stories/ContinueReading";
// Portada principal para lectores.
// Compone navbar, carrusel destacado, filas de historias y acceso de usuario.
import { useEffect, useMemo, useState } from "react";
import { fetchStories } from "../api/storyApi";
import { fetchIllustrations } from "../api/illustrationApi";
import { fetchCommunityFeed } from "../api/profileApi";
const AuthPanel=lazy(()=>import('../components/auth/AuthPanel').then(x=>({default:x.AuthPanel}))); 
import { AppShell } from "../components/layout/AppShell";
import { Navbar } from "../components/layout/Navbar";
import { HeroSection } from "../components/stories/HeroSection";
import { HomeShelf } from "../components/stories/HomeShelf";
import { PromoBanner } from "../components/stories/PromoBanner";
import { ALL_CATEGORIES } from "../data/categories";

import valoriaLogo from "../assets/valoria-logo.webp";
import styles from "../styles/HomePage.module.css";

export function LegacyHomePage({
  auth,
  currentView,
  navFilters,
  onNavigate,
  onOpenStory,
  onOpenIllustration,
  showLoginPanel,
  homeSection = "",
  homeSectionRequestKey = 0
}) {
  const [stories, setStories] = useState([]);
  const [illustrations, setIllustrations] = useState([]);
  const [communityFeed, setCommunityFeed] = useState([]);
  const [status, setStatus] = useState("loading");
  const [retry,setRetry]=useState(0);
  const authDockId = "auth";
  const { selectedCategory, storySearchQuery, writerSearchQuery } = navFilters;
  const hasActiveSearch =
    Boolean(storySearchQuery.trim()) || Boolean(writerSearchQuery.trim());

  const categoryOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...ALL_CATEGORIES,
          ...stories.map((story) => story.category).filter(Boolean)
        ])
      ).sort((left, right) => left.localeCompare(right)),
    [stories]
  );

  const filteredStories = useMemo(() => {
    const storyNeedle = storySearchQuery.trim().toLowerCase();
    const writerNeedle = writerSearchQuery.trim().toLowerCase();

    return stories.filter((story) => {
      const matchesCategory = selectedCategory
        ? story.category === selectedCategory
        : true;

      const searchableStoryText = [
        story.title,
        story.description,
        story.category,
        ...(Array.isArray(story.tags) ? story.tags : [])
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesStorySearch = storyNeedle
        ? searchableStoryText.includes(storyNeedle)
        : true;
      const matchesWriterSearch = writerNeedle
        ? String(story.author || "").toLowerCase().includes(writerNeedle)
        : true;

      return matchesCategory && matchesStorySearch && matchesWriterSearch;
    });
  }, [selectedCategory, stories, storySearchQuery, writerSearchQuery]);

  const filteredIllustrations = useMemo(() => {
    const storyNeedle = storySearchQuery.trim().toLowerCase();
    const writerNeedle = writerSearchQuery.trim().toLowerCase();

    return illustrations.filter((illustration) => {
      const categories = illustration.categories || [];
      const tags = illustration.tags || [];
      const matchesCategory = selectedCategory
        ? categories.includes(selectedCategory)
        : true;

      const searchableIllustrationText = [
        illustration.title,
        illustration.description,
        illustration.author,
        ...categories,
        ...tags
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesStorySearch = storyNeedle
        ? searchableIllustrationText.includes(storyNeedle)
        : true;
      const matchesWriterSearch = writerNeedle
        ? String(illustration.author || "").toLowerCase().includes(writerNeedle)
        : true;

      return matchesCategory && matchesStorySearch && matchesWriterSearch;
    });
  }, [illustrations, selectedCategory, storySearchQuery, writerSearchQuery]);

  const hasActiveFilters = Boolean(selectedCategory) || hasActiveSearch;

  const valoriaSpecial = useMemo(() => {
    const availableCategories = categoryOptions.filter(Boolean);

    if (availableCategories.length === 0) {
      return {
        storyCategories: [],
        stories: [],
        illustrationCategories: [],
        illustrations: []
      };
    }

    const daySeed = Math.floor(Date.now() / 86400000);
    const firstIndex = daySeed % availableCategories.length;
    const secondIndex = (firstIndex + 1) % availableCategories.length;
    const categories = Array.from(
      new Set([
        availableCategories[firstIndex],
        availableCategories[secondIndex]
      ])
    );

    const storiesByCategory = categories.flatMap((category) =>
      stories
        .filter((story) => story.category === category)
        .sort((left, right) => {
          const featuredScore = Number(right.is_featured || 0) - Number(left.is_featured || 0);
          if (featuredScore !== 0) {
            return featuredScore;
          }

          return Number(right.reads_count || 0) - Number(left.reads_count || 0);
        })
        .slice(0, 2)
    );

    const illustrationCategories = Array.from(
      new Set(
        illustrations.flatMap((illustration) => illustration.categories || [])
      )
    );

    const illustrationFirstIndex = illustrationCategories.length
      ? daySeed % illustrationCategories.length
      : 0;
    const illustrationSecondIndex = illustrationCategories.length
      ? (illustrationFirstIndex + 1) % illustrationCategories.length
      : 0;
    const selectedIllustrationCategories = Array.from(
      new Set(
        [illustrationCategories[illustrationFirstIndex], illustrationCategories[illustrationSecondIndex]].filter(Boolean)
      )
    );

    const illustrationsByCategory = selectedIllustrationCategories.flatMap((category) =>
      illustrations
        .filter((illustration) => (illustration.categories || []).includes(category))
        .sort(
          (left, right) =>
            Number(right.likesCount || 0) - Number(left.likesCount || 0)
        )
        .slice(0, 2)
    );

    return {
      storyCategories: categories,
      stories: storiesByCategory.slice(0, 3),
      illustrationCategories: selectedIllustrationCategories,
      illustrations: illustrationsByCategory.slice(0, 3)
    };
  }, [categoryOptions, illustrations, stories]);

  const filteredShelves = useMemo(() => {
    const chunks = [];
    const labels = [
      {
        title: hasActiveFilters ? "Resultados destacados" : "Las mejores selecciones para ti",
        subtitle: hasActiveFilters
          ? "Historias que coinciden con tu filtro actual."
          : "Ficcion romantica, fantasia y drama serial para perderte por horas."
      },
      {
        title: hasActiveFilters ? "Mas historias relacionadas" : "Historias para quedarse despierto",
        subtitle: hasActiveFilters
          ? "Sigue explorando resultados dentro de la misma busqueda."
          : "Series largas con cliffhangers, pactos rotos y secretos familiares."
      },
      {
        title: hasActiveFilters ? "Sigue descubriendo" : "Creemos que las disfrutaras",
        subtitle: hasActiveFilters
          ? "Una ultima tanda de historias filtradas para continuar leyendo."
          : "Lecturas suaves, intensas y muy faciles de devorar desde el primer capitulo."
      }
    ];

    for (let index = 0; index < labels.length; index += 1) {
      const storiesSlice = filteredStories.slice(index * 6, index * 6 + 6);
      if (!storiesSlice.length) {
        continue;
      }

      chunks.push({
        id: `shelf-${index}`,
        ...labels[index],
        stories: storiesSlice.map((story, storyIndex) => ({
          id: story.id || `story-${index}-${storyIndex}`,
          title: story.title,
          author: story.author,
          cover: story.cover,
          reads: story.reads,
          ratingAverage: story.ratingAverage,
          ratingCount: story.ratingCount
        }))
      });
    }

    return chunks;
  }, [filteredStories, hasActiveFilters]);

  const upperShelves = filteredShelves.slice(0, 2);
  const lowerShelves = filteredShelves.slice(2);

  const illustrationShelves = useMemo(() => {
    const labels = [
      {
        id: "illustration-shelf-0",
        title: hasActiveFilters ? "Ilustraciones destacadas" : "Galeria destacada para ti",
        subtitle: hasActiveFilters
          ? "Obras visuales que coinciden con tu filtro actual."
          : "Piezas visuales para descubrir autores, estilos y atmosferas."
      },
      {
        id: "illustration-shelf-1",
        title: hasActiveFilters ? "Mas ilustraciones relacionadas" : "Obras para mirar con calma",
        subtitle: hasActiveFilters
          ? "Sigue explorando obras dentro de la misma busqueda."
          : "Fanart, concept art y piezas visuales para acompañar la lectura."
      }
    ];

    return labels
      .map((label, index) => ({
        ...label,
        illustrations: filteredIllustrations.slice(index * 4, index * 4 + 4)
      }))
      .filter((section) => section.illustrations.length > 0);
  }, [filteredIllustrations, hasActiveFilters]);

  const storyInsights = useMemo(() => {
    const realStories = stories.filter(Boolean);
    const publishedCount = realStories.length;
    const categoryCount = new Set(
      realStories.map((story) => story.category).filter(Boolean)
    ).size;
    const ratedStories = realStories.filter((story) => {
      const rating = Number(story.ratingAverage ?? story.rating_average ?? 0);
      return Number.isFinite(rating) && rating > 0;
    });
    const averageRating = ratedStories.length
      ? (
          ratedStories.reduce(
            (sum, story) =>
              sum + Number(story.ratingAverage ?? story.rating_average ?? 0),
            0
          ) / ratedStories.length
        ).toFixed(1)
      : "0.0";

    return {
      publishedCount,
      categoryCount,
      averageRating
    };
  }, [stories]);

  const illustrationInsights = useMemo(() => {
    const realIllustrations = illustrations.filter(Boolean);
    const publishedCount = realIllustrations.length;
    const categoryCount = new Set(
      realIllustrations.flatMap((illustration) => illustration.categories || [])
    ).size;
    const averageLikes = realIllustrations.length
      ? (
          realIllustrations.reduce(
            (sum, illustration) => sum + Number(illustration.likesCount || 0),
            0
          ) / realIllustrations.length
        ).toFixed(1)
      : "0.0";

    return {
      publishedCount,
      categoryCount,
      averageLikes
    };
  }, [illustrations]);

  useEffect(() => {
    let active = true;

    async function loadStories() {
      setStatus("loading");
      try {
        const [storiesData, illustrationsData, communityData] = await Promise.all([
          fetchStories(auth.token),
          fetchIllustrations(auth.token).catch(() => ({ illustrations: [] })),
          fetchCommunityFeed(6,auth.token).catch(() => ({ posts: [] }))
        ]);
        if (active) {
          setStories(storiesData.stories);
          setIllustrations(illustrationsData.illustrations || []);
          setCommunityFeed(launchCommunity(communityData.posts || []));
          setStatus("ready");
        }
      } catch (error) {
        if (active) {
          setStories([]);
          setStatus("error");
          setIllustrations([]);
          setCommunityFeed([]);
        }
      }
    }

    loadStories();

    return () => {
      active = false;
    };
  }, [auth.token,retry]);

  useEffect(() => {
    if (!homeSection) {
      return;
    }

    const target = document.getElementById(homeSection);
    if (!target) {
      return;
    }

    window.requestAnimationFrame(() => {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  }, [homeSection, homeSectionRequestKey]);

  return (
    <AppShell auth={auth} currentView={currentView} onNavigate={onNavigate}>
      <main className={styles.page}>
        <Navbar
          auth={auth}
          categoryOptions={categoryOptions}
          currentView={currentView}
          {...navFilters}
          onNavigate={onNavigate}
        />
        <div id={authDockId} className={styles.authAnchor} />
        <SiteNotice /><WelcomeGuide key={auth.user?.id||"guest"} auth={auth} onNavigate={onNavigate}/>
        

        {showLoginPanel && !auth.isAuthenticated ? (
          <>
            <button
              aria-label={ui("Cerrar login")}
              className={styles.authBackdrop}
              onClick={() => onNavigate("home")}
              type="button"
            />
            <section className={styles.authDock}>
              <Suspense fallback={<ActivityState kind="loading"/>}><AuthPanel
                auth={auth}
                defaultMode="login"
                description="Entra para comentar, guardar lecturas y abrir tu espacio de creador."
                footer={
                  <button
                    className={styles.inlineLink}
                    onClick={() => onNavigate("register")}
                    type="button"
                  >{" Crear una cuenta nueva "}</button>
                }
                onSuccessfulAuth={() => onNavigate("home")}
                showSwitcher={false}
                title={ui("Inicia sesion en Valoria")}
                variant="drawer"
              /></Suspense>
            </section>
          </>
        ) : null}

        <div className={styles.contentFlow}>
        {status === "loading" ? (
          <ActivityState kind="loading" title="Cargando historias e ilustraciones..."/>
        ) : status==="error" ? <ActivityState kind="error" message="Tu contenido guardado se conserva. Vuelve a intentarlo." action="Reintentar" onAction={()=>setRetry(x=>x+1)}/> : (
          <>
        {!hasActiveSearch ? (
          <>
            <ContinueReading auth={auth} onNavigate={onNavigate} /><PersonalizedShelves auth={auth} stories={stories} onOpenStory={onOpenStory} onNavigate={onNavigate}/>
            <EditorialPicks onNavigate={onNavigate}/><LaunchShelf stories={filteredStories} onOpenStory={onOpenStory} onNavigate={onNavigate}/>
            <HeroSection
              illustrations={filteredIllustrations}
              onOpenIllustration={onOpenIllustration}
              onOpenStory={onOpenStory}
              stories={filteredStories}
            />

            <CategoryStrip compact onSelectCategory={category=>navFilters.onSearchSubmit('','all','',{category})} onViewAll={()=>navFilters.onSearchSubmit('','all','',{})}/>
            <CreativeChallenge onNavigate={onNavigate}/>
            <section className={styles.insightsCard}>
              <div className={styles.insightsHeader}>
                <img src={valoriaLogo} alt={ui("Icono Valoria")} />
                <div>
                  <strong>{ui("Valoria")}</strong>
                  <span>{ui("Lectura social y descubrimiento")}</span>
                </div>
              </div>
              <div className={styles.insightsGrid}>
                <article className={styles.insightMetric}>
                  <span className={styles.insightLabel}>{ui("Historias")}</span>
                  <strong>{storyInsights.publishedCount}</strong>
                  <span>{ui("en vitrina")}</span>
                </article>
                <article className={styles.insightMetric}>
                  <span className={styles.insightLabel}>{ui("Rating")}</span>
                  <strong>{storyInsights.averageRating}</strong>
                  <span>{ui("media de historias")}</span>
                </article>
                <article className={styles.insightMetric}>
                  <span className={styles.insightLabel}>{ui("Ilustraciones")}</span>
                  <strong>{illustrationInsights.publishedCount}</strong>
                  <span>{ui("para descubrir")}</span>
                </article>
                <article className={styles.insightMetric}>
                  <span className={styles.insightLabel}>{ui("Cat. visuales")}</span>
                  <strong>{illustrationInsights.categoryCount}</strong>
                  <span>{ui("activas")}</span>
                </article>
                <article className={styles.insightMetric}>
                  <span className={styles.insightLabel}>{ui("Likes medios")}</span>
                  <strong>{illustrationInsights.averageLikes}</strong>
                  <span>{ui("por ilustracion")}</span>
                </article>
                <article className={styles.insightMetric}>
                  <span className={styles.insightLabel}>{ui("Cat. lectura")}</span>
                  <strong>{storyInsights.categoryCount}</strong>
                  <span>{ui("listas para explorar")}</span>
                </article>
              </div>
            </section>
          </>
        ) : (
          <section className={styles.searchModeHeader}>
            <span>{ui("Resultados")}</span>
            <h2>{ui("Mostrando solo las historias que coinciden con tu busqueda")}</h2>
            <p>{ui(" Filtrando por ")}{storySearchQuery.trim()
                ? ui(" historia o etiqueta: \"{0}\"",[storySearchQuery.trim()])
                : ""}
              {storySearchQuery.trim() && writerSearchQuery.trim() ? ui(" y") : ""}
              {writerSearchQuery.trim()
                ? ui(" escritor: \"{0}\"",[writerSearchQuery.trim()])
                : ""}
              {selectedCategory ? ui(" en {0}",[selectedCategory]) : ""}.
            </p>
          </section>
        )}

        <section id="explorar" className={styles.feed}>
          {upperShelves.length || illustrationShelves.length ? (
            <>
              {upperShelves[0] ? (
                <HomeShelf
                  key={upperShelves[0].id}
                  onOpenAuthor={(profileId) =>
                    onNavigate("creator-profile", { profileId })
                  }
                  onOpenStory={onOpenStory}
                  section={upperShelves[0]}
                  sectionId="series-destacadas"
                />
              ) : null}

              {illustrationShelves[0] ? (
                <section className={styles.illustrationSection}>
                  <div className={styles.illustrationSectionHeader}>
                    <div>
                      <span>{ui(illustrationShelves[0].title)}</span>
                      <h2>{ui(illustrationShelves[0].subtitle)}</h2>
                    </div>
                    <button
                      className={styles.illustrationSectionAction}
                      onClick={() => onNavigate("illustrations")}
                      type="button"
                    >{ui(" Ver galeria completa ")}</button>
                  </div>

                  <div className={styles.illustrationGrid}>
                    {illustrationShelves[0].illustrations.map((illustration) => (
                      <article key={illustration.id} className={styles.illustrationCard}>
                        <div className={styles.illustrationCardButton}>
                          <div className={styles.illustrationImageWrap}>
                            <span className={styles.illustrationTypePill}>{ui(" Ilustracion ")}</span>
                            <button type="button" aria-label={ui("Abrir ilustración {0}",[illustration.title])} onClick={()=>onOpenIllustration?.(illustration)} style={{padding:0,width:"100%"}}><img loading="lazy" src={illustration.coverUrl} alt={illustration.title} /></button>
                            <div className={styles.illustrationOverlay}>
                              <button
                                className={styles.illustrationAuthorLink}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  illustration.authorId
                                    ? onNavigate("creator-profile", {
                                        profileId: illustration.authorId
                                      })
                                    : null;
                                }}
                                type="button"
                              >
                                {illustration.author || ui("Ilustrador de Valoria")}
                              </button>
                            </div>
                          </div>
                          <div className={styles.illustrationMetaRow}>
                            <span>{illustration.likesCount || 0}{ui(" me gusta")}</span>
                            <span>{illustration.commentsCount || 0}{ui(" comentarios")}</span>
                          </div>
                          <div className={styles.illustrationBadgeRow}>
                            {(illustration.categories || []).slice(0, 2).map((category) => (
                              <span key={`${illustration.id}-${category}`}>{ui(category)}</span>
                            ))}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ) : null}

              {upperShelves[1] ? (
                <HomeShelf
                  key={upperShelves[1].id}
                  onOpenAuthor={(profileId) =>
                    onNavigate("creator-profile", { profileId })
                  }
                  onOpenStory={onOpenStory}
                  section={upperShelves[1]}
                />
              ) : null}
            </>
          ) : (
            <section className={styles.emptyState}>
              <strong>{ui("No encontramos historias con ese filtro.")}</strong>
              <p>{ui(" Prueba con otra categoria, una parte del titulo o el nombre del escritor. ")}</p>
            </section>
          )}

          {!hasActiveSearch &&
          (valoriaSpecial.stories.length > 0 ||
            valoriaSpecial.illustrations.length > 0) ? (
            <PromoBanner
              illustrationCategories={valoriaSpecial.illustrationCategories}
              illustrations={valoriaSpecial.illustrations}
              onOpenIllustration={onOpenIllustration}
              onOpenStory={onOpenStory}
              storyCategories={valoriaSpecial.storyCategories}
              stories={valoriaSpecial.stories}
            />
          ) : null}

          {illustrationShelves[1] ? (
            <section className={styles.illustrationSection}>
              <div className={styles.illustrationSectionHeader}>
                <div>
                  <span>{ui(illustrationShelves[1].title)}</span>
                  <h2>{ui(illustrationShelves[1].subtitle)}</h2>
                </div>
                <button
                  className={styles.illustrationSectionAction}
                  onClick={() => onNavigate("illustrations")}
                  type="button"
                >{ui(" Ver galeria completa ")}</button>
              </div>

              <div className={styles.illustrationGrid}>
                {illustrationShelves[1].illustrations.map((illustration) => (
                  <article key={illustration.id} className={styles.illustrationCard}>
                    <div className={styles.illustrationCardButton}>
                      <div className={styles.illustrationImageWrap}>
                        <span className={styles.illustrationTypePill}>{ui(" Ilustracion ")}</span>
                        <button type="button" aria-label={ui("Abrir ilustración {0}",[illustration.title])} onClick={()=>onOpenIllustration?.(illustration)} style={{padding:0,width:"100%"}}><img loading="lazy" src={illustration.coverUrl} alt={illustration.title} /></button>
                        <div className={styles.illustrationOverlay}>
                          <button
                            className={styles.illustrationAuthorLink}
                            onClick={(event) => {
                              event.stopPropagation();
                              illustration.authorId
                                ? onNavigate("creator-profile", {
                                    profileId: illustration.authorId
                                  })
                                : null;
                            }}
                            type="button"
                          >
                            {illustration.author || ui("Ilustrador de Valoria")}
                          </button>
                        </div>
                      </div>
                      <div className={styles.illustrationMetaRow}>
                        <span>{illustration.likesCount || 0}{ui(" me gusta")}</span>
                        <span>{illustration.commentsCount || 0}{ui(" comentarios")}</span>
                      </div>
                      <div className={styles.illustrationBadgeRow}>
                        {(illustration.categories || []).slice(0, 2).map((category) => (
                          <span key={`${illustration.id}-${category}`}>{ui(category)}</span>
                        ))}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {lowerShelves.map((section) => (
            <HomeShelf
              key={section.id}
              onOpenAuthor={(profileId) =>
                onNavigate("creator-profile", { profileId })
              }
              onOpenStory={onOpenStory}
              section={section}
            />
          ))}
        </section>

        {!hasActiveSearch ? (
          <section id="comunidad" className={styles.community}>
            <div className={styles.communityCopy}>
              <span>{ui("Comunidad")}</span>
              <h2>{ui("Encuentra tu comunidad creativa")}</h2>
              <p>{ui("Comparte tus avances, conversa con otros creadores y descubre nuevas voces.")}</p>
            </div>
            <div className={styles.communityGrid}>
              {communityFeed.length > 0 ? (
                communityFeed.slice(0, 3).map((post) => (
                  <article
                    key={post.id}
                    className={`${styles.communityCard} ${styles.communityCardClickable}`}
                    onClick={() => onNavigate("creator-profile", { profileId: post.creatorId })}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onNavigate("creator-profile", { profileId: post.creatorId });
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div
                      className={styles.communityCardCover}
                      style={
                        post.creatorCoverUrl
                          ? { backgroundImage: `url("${post.creatorCoverUrl}")` }
                          : undefined
                      }
                    />
                    <div className={styles.communityCardBody}>
                      <div className={styles.communityAuthor}>
                        <div className={styles.communityAvatar}>
                          {post.creatorAvatarUrl ? (
                            <img alt={post.creatorName} src={post.creatorAvatarUrl} />
                          ) : (
                            post.creatorName?.slice(0, 1).toUpperCase() || ui("V")
                          )}
                        </div>
                        <div>
                          <strong>{post.creatorName}</strong>
                          <small>{post.creatorHandle}</small>
                        </div>
                      </div>
                      <p>{post.content}</p>
                      <div className={styles.communityMeta}>
                        <span>{post.storyCount}{ui(" historias")}</span>
                        <span>{post.followerCount}{ui(" seguidores")}</span>
                        <span>{post.commentCount}{ui(" comentarios")}</span>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <article className={styles.communityPlaceholder}>
                  <strong>{ui("La comunidad aparecera aqui.")}</strong>
                  <p>{ui(" Cuando haya publicaciones recientes del muro de creador, esta seccion las destacara automaticamente. ")}</p>
                </article>
              )}
            </div>
          </section>
        ) : null}
          </>
        )}
        </div>
      </main>
    </AppShell>
  );
}

