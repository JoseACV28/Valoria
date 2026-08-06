// Portada principal para lectores.
// Compone navbar, carrusel destacado, filas de historias y acceso de usuario.
import { useEffect, useMemo, useState } from "react";
import { fetchStories } from "../api/storyApi";
import { fetchIllustrations } from "../api/illustrationApi";
import { fetchCommunityFeed } from "../api/profileApi";
import { AuthPanel } from "../components/auth/AuthPanel";
import { AppShell } from "../components/layout/AppShell";
import { Navbar } from "../components/layout/Navbar";
import { HeroSection } from "../components/stories/HeroSection";
import { HomeShelf } from "../components/stories/HomeShelf";
import { PromoBanner } from "../components/stories/PromoBanner";
import { ALL_CATEGORIES } from "../data/categories";
import { fallbackStories } from "../data/fallbackStories";
import valoriaLogo from "../assets/valoria-logo.png";
import styles from "../styles/HomePage.module.css";

export function HomePage({
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
  const [stories, setStories] = useState(fallbackStories);
  const [illustrations, setIllustrations] = useState([]);
  const [communityFeed, setCommunityFeed] = useState([]);
  const [status, setStatus] = useState("loading");
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
      try {
        const [storiesData, illustrationsData, communityData] = await Promise.all([
          fetchStories(),
          fetchIllustrations().catch(() => ({ illustrations: [] })),
          fetchCommunityFeed(6).catch(() => ({ posts: [] }))
        ]);
        if (active) {
          setStories(storiesData.stories);
          setIllustrations(illustrationsData.illustrations || []);
          setCommunityFeed(communityData.posts || []);
          setStatus("ready");
        }
      } catch (error) {
        if (active) {
          setStatus("fallback");
          setIllustrations([]);
          setCommunityFeed([]);
        }
      }
    }

    loadStories();

    return () => {
      active = false;
    };
  }, []);

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

        {showLoginPanel && !auth.isAuthenticated ? (
          <>
            <button
              aria-label="Cerrar login"
              className={styles.authBackdrop}
              onClick={() => onNavigate("home")}
              type="button"
            />
            <section className={styles.authDock}>
              <div className={styles.authDockHeader}>
                <button
                  className={styles.authClose}
                  onClick={() => onNavigate("home")}
                  type="button"
                >
                  Cerrar
                </button>
              </div>
              <AuthPanel
                auth={auth}
                defaultMode="login"
                description="Entra para comentar, guardar lecturas y abrir tu espacio de creador."
                footer={
                  <button
                    className={styles.inlineLink}
                    onClick={() => onNavigate("register")}
                    type="button"
                  >
                    Crear una cuenta nueva
                  </button>
                }
                onSuccessfulAuth={() => onNavigate("home")}
                showSwitcher={false}
                title="Inicia sesion en Valoria"
                variant="drawer"
              />
            </section>
          </>
        ) : null}

        {!hasActiveSearch ? (
          <>
            <HeroSection
              illustrations={filteredIllustrations}
              onOpenIllustration={onOpenIllustration}
              onOpenStory={onOpenStory}
              stories={filteredStories}
            />

            <section className={styles.insightsCard}>
              <div className={styles.insightsHeader}>
                <img src={valoriaLogo} alt="Icono Valoria" />
                <div>
                  <strong>Valoria</strong>
                  <span>Lectura social y descubrimiento</span>
                </div>
              </div>
              <div className={styles.insightsGrid}>
                <article className={styles.insightMetric}>
                  <span className={styles.insightLabel}>Historias</span>
                  <strong>{storyInsights.publishedCount}</strong>
                  <span>en vitrina</span>
                </article>
                <article className={styles.insightMetric}>
                  <span className={styles.insightLabel}>Rating</span>
                  <strong>{storyInsights.averageRating}</strong>
                  <span>media de historias</span>
                </article>
                <article className={styles.insightMetric}>
                  <span className={styles.insightLabel}>Ilustraciones</span>
                  <strong>{illustrationInsights.publishedCount}</strong>
                  <span>para descubrir</span>
                </article>
                <article className={styles.insightMetric}>
                  <span className={styles.insightLabel}>Cat. visuales</span>
                  <strong>{illustrationInsights.categoryCount}</strong>
                  <span>activas</span>
                </article>
                <article className={styles.insightMetric}>
                  <span className={styles.insightLabel}>Likes medios</span>
                  <strong>{illustrationInsights.averageLikes}</strong>
                  <span>por ilustracion</span>
                </article>
                <article className={styles.insightMetric}>
                  <span className={styles.insightLabel}>Cat. lectura</span>
                  <strong>{storyInsights.categoryCount}</strong>
                  <span>listas para explorar</span>
                </article>
              </div>
            </section>
          </>
        ) : (
          <section className={styles.searchModeHeader}>
            <span>Resultados</span>
            <h2>Mostrando solo las historias que coinciden con tu busqueda</h2>
            <p>
              Filtrando por
              {storySearchQuery.trim()
                ? ` historia o etiqueta: "${storySearchQuery.trim()}"`
                : ""}
              {storySearchQuery.trim() && writerSearchQuery.trim() ? " y" : ""}
              {writerSearchQuery.trim()
                ? ` escritor: "${writerSearchQuery.trim()}"`
                : ""}
              {selectedCategory ? ` en ${selectedCategory}` : ""}.
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
                      <span>{illustrationShelves[0].title}</span>
                      <h2>{illustrationShelves[0].subtitle}</h2>
                    </div>
                    <button
                      className={styles.illustrationSectionAction}
                      onClick={() => onNavigate("illustrations")}
                      type="button"
                    >
                      Ver galeria completa
                    </button>
                  </div>

                  <div className={styles.illustrationGrid}>
                    {illustrationShelves[0].illustrations.map((illustration) => (
                      <article key={illustration.id} className={styles.illustrationCard}>
                        <button
                          className={styles.illustrationCardButton}
                          onClick={() => onOpenIllustration?.(illustration)}
                          type="button"
                        >
                          <div className={styles.illustrationImageWrap}>
                            <span className={styles.illustrationTypePill}>
                              Ilustracion
                            </span>
                            <img src={illustration.coverUrl} alt={illustration.title} />
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
                                {illustration.author || "Ilustrador de Valoria"}
                              </button>
                            </div>
                          </div>
                          <div className={styles.illustrationMetaRow}>
                            <span>{illustration.likesCount || 0} me gusta</span>
                            <span>{illustration.commentsCount || 0} comentarios</span>
                          </div>
                          <div className={styles.illustrationBadgeRow}>
                            {(illustration.categories || []).slice(0, 2).map((category) => (
                              <span key={`${illustration.id}-${category}`}>{category}</span>
                            ))}
                          </div>
                        </button>
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
              <strong>No encontramos historias con ese filtro.</strong>
              <p>
                Prueba con otra categoria, una parte del titulo o el nombre del escritor.
              </p>
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
                  <span>{illustrationShelves[1].title}</span>
                  <h2>{illustrationShelves[1].subtitle}</h2>
                </div>
                <button
                  className={styles.illustrationSectionAction}
                  onClick={() => onNavigate("illustrations")}
                  type="button"
                >
                  Ver galeria completa
                </button>
              </div>

              <div className={styles.illustrationGrid}>
                {illustrationShelves[1].illustrations.map((illustration) => (
                  <article key={illustration.id} className={styles.illustrationCard}>
                    <button
                      className={styles.illustrationCardButton}
                      onClick={() => onOpenIllustration?.(illustration)}
                      type="button"
                    >
                      <div className={styles.illustrationImageWrap}>
                        <span className={styles.illustrationTypePill}>
                          Ilustracion
                        </span>
                        <img src={illustration.coverUrl} alt={illustration.title} />
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
                            {illustration.author || "Ilustrador de Valoria"}
                          </button>
                        </div>
                      </div>
                      <div className={styles.illustrationMetaRow}>
                        <span>{illustration.likesCount || 0} me gusta</span>
                        <span>{illustration.commentsCount || 0} comentarios</span>
                      </div>
                      <div className={styles.illustrationBadgeRow}>
                        {(illustration.categories || []).slice(0, 2).map((category) => (
                          <span key={`${illustration.id}-${category}`}>{category}</span>
                        ))}
                      </div>
                    </button>
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
              <span>Comunidad</span>
              <h2>La comunidad creadora ya esta viva dentro de Valoria</h2>
              <p>
                Estados reales, comentarios entre autores y conexiones de seguimiento
                sembradas sobre la base para que puedas probar el ecosistema completo.
              </p>
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
                            post.creatorName?.slice(0, 1).toUpperCase() || "V"
                          )}
                        </div>
                        <div>
                          <strong>{post.creatorName}</strong>
                          <small>{post.creatorHandle}</small>
                        </div>
                      </div>
                      <p>{post.content}</p>
                      <div className={styles.communityMeta}>
                        <span>{post.storyCount} historias</span>
                        <span>{post.followerCount} seguidores</span>
                        <span>{post.commentCount} comentarios</span>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <article className={styles.communityPlaceholder}>
                  <strong>La comunidad aparecera aqui.</strong>
                  <p>
                    Cuando haya publicaciones recientes del muro de creador, esta
                    seccion las destacara automaticamente.
                  </p>
                </article>
              )}
            </div>
          </section>
        ) : null}
      </main>
    </AppShell>
  );
}
