// Vista dedicada para autores.
// Lista historias propias, capitulos y herramientas de publicacion.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  deleteChapter,
  deleteStory,
  fetchMyStories,
  fetchStoryChapters,
  updateChapter
} from "../api/storyApi";
import {
  deleteIllustration,
  fetchMyIllustrations
} from "../api/illustrationApi";
import { AppShell } from "../components/layout/AppShell";
import { StarRating } from "../components/common/StarRating";
import { Navbar } from "../components/layout/Navbar";
import { CreatorStudio } from "../components/stories/CreatorStudio";
import { IllustrationStudio } from "../components/illustrations/IllustrationStudio";
import { clampRating } from "../utils/ratings";
import styles from "../styles/CreatorDashboard.module.css";

export function CreatorDashboard({ auth, navFilters, onNavigate }) {
  const [creatorMode, setCreatorMode] = useState("stories");
  const [stories, setStories] = useState([]);
  const [selectedStoryId, setSelectedStoryId] = useState("");
  const [chapters, setChapters] = useState([]);
  const [illustrations, setIllustrations] = useState([]);
  const [selectedIllustrationId, setSelectedIllustrationId] = useState("");
  const [status, setStatus] = useState("loading");
  const [showStoryComposer, setShowStoryComposer] = useState(false);
  const [showChapterComposer, setShowChapterComposer] = useState(false);
  const [showIllustrationComposer, setShowIllustrationComposer] = useState(false);
  const [selectedChapterId, setSelectedChapterId] = useState("");
  const [editingChapterId, setEditingChapterId] = useState("");
  const [editingIllustrationId, setEditingIllustrationId] = useState("");
  const [chapterActionMessage, setChapterActionMessage] = useState("");
  const [illustrationActionMessage, setIllustrationActionMessage] = useState("");
  const [pendingDeleteChapterId, setPendingDeleteChapterId] = useState("");
  const [pendingDeleteIllustrationId, setPendingDeleteIllustrationId] = useState("");

  const selectedStory = useMemo(
    () => stories.find((story) => story.id === selectedStoryId) || null,
    [stories, selectedStoryId]
  );
  const selectedChapter = useMemo(
    () => chapters.find((chapter) => chapter.id === selectedChapterId) || null,
    [chapters, selectedChapterId]
  );
  const editingChapter = useMemo(
    () => chapters.find((chapter) => chapter.id === editingChapterId) || null,
    [chapters, editingChapterId]
  );
  const selectedIllustration = useMemo(
    () =>
      illustrations.find((illustration) => illustration.id === selectedIllustrationId) ||
      null,
    [illustrations, selectedIllustrationId]
  );
  const editingIllustration = useMemo(
    () =>
      illustrations.find((illustration) => illustration.id === editingIllustrationId) ||
      null,
    [illustrations, editingIllustrationId]
  );
  const pendingDeleteIllustration = useMemo(
    () =>
      illustrations.find(
        (illustration) => illustration.id === pendingDeleteIllustrationId
      ) || null,
    [illustrations, pendingDeleteIllustrationId]
  );
  const pendingDeleteChapter = useMemo(
    () => chapters.find((chapter) => chapter.id === pendingDeleteChapterId) || null,
    [chapters, pendingDeleteChapterId]
  );
  const chapterComposerRef = useRef(null);
  const illustrationComposerRef = useRef(null);
  const publishedChapters = useMemo(
    () => chapters.filter((chapter) => chapter.status === "published"),
    [chapters]
  );
  const draftChapters = useMemo(
    () => chapters.filter((chapter) => chapter.status !== "published"),
    [chapters]
  );
  const publishedIllustrations = useMemo(
    () => illustrations.filter((illustration) => illustration.status === "published"),
    [illustrations]
  );
  const draftIllustrations = useMemo(
    () => illustrations.filter((illustration) => illustration.status !== "published"),
    [illustrations]
  );

  useEffect(() => {
    if (!auth.isAuthenticated) {
      return;
    }

    async function loadStories() {
      try {
        const data = await fetchMyStories(auth.token);
        setStories(data.stories);
        setSelectedStoryId((current) => current || data.stories[0]?.id || "");
        setStatus("ready");
      } catch (error) {
        setStatus("error");
      }
    }

    loadStories();
  }, [auth.isAuthenticated, auth.token]);

  useEffect(() => {
    if (!auth.isAuthenticated) {
      return;
    }

    async function loadIllustrations() {
      try {
        const data = await fetchMyIllustrations(auth.token);
        setIllustrations(data.illustrations || []);
        setSelectedIllustrationId(
          (current) => current || data.illustrations?.[0]?.id || ""
        );
      } catch {
        setIllustrations([]);
        setSelectedIllustrationId("");
      }
    }

    loadIllustrations();
  }, [auth.isAuthenticated, auth.token]);

  useEffect(() => {
    if (!selectedStoryId) {
      setChapters([]);
      setSelectedChapterId("");
      setEditingChapterId("");
      setChapterActionMessage("");
      setShowChapterComposer(false);
      return;
    }

    async function loadChapters() {
      try {
        const data = await fetchStoryChapters(selectedStoryId);
        setChapters(data.chapters);
        setSelectedChapterId((current) =>
          data.chapters.some((chapter) => chapter.id === current)
            ? current
            : data.chapters[0]?.id || ""
        );
      } catch (error) {
        setChapters([]);
        setSelectedChapterId("");
      }
    }

    loadChapters();
  }, [selectedStoryId]);

  useEffect(() => {
    if (!showChapterComposer) {
      return;
    }

    const scrollTarget = chapterComposerRef.current;

    if (!scrollTarget) {
      return;
    }

    window.requestAnimationFrame(() => {
      scrollTarget.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  }, [showChapterComposer, editingChapterId]);

  useEffect(() => {
    if (!showIllustrationComposer) {
      return;
    }

    const scrollTarget = illustrationComposerRef.current;

    if (!scrollTarget) {
      return;
    }

    window.requestAnimationFrame(() => {
      scrollTarget.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  }, [showIllustrationComposer, editingIllustrationId]);

  async function handlePublishChapter(chapter) {
    try {
      const result = await updateChapter(
        selectedStoryId,
        chapter.id,
        {
          title: chapter.title,
          chapterNumber: chapter.chapter_number,
          excerpt: chapter.excerpt,
          content: chapter.content,
          status: "published",
          publishedAt: chapter.published_at
        },
        auth.token
      );

      setChapters((current) =>
        current.map((item) => (item.id === chapter.id ? result.chapter : item))
      );
      if (result.story) {
        setStories((current) =>
          current.map((item) =>
            item.id === result.story.id ? { ...item, ...result.story } : item
          )
        );
      } else {
        setStories((current) =>
          current.map((item) =>
            item.id === selectedStoryId ? { ...item, status: "published" } : item
          )
        );
      }
      setSelectedChapterId(result.chapter.id);
      setEditingChapterId("");
      setShowChapterComposer(false);
      setChapterActionMessage("Capitulo publicado.");
    } catch (error) {
      setChapterActionMessage(error.message);
    }
  }

  if (!auth.isAuthenticated) {
    return (
      <AppShell auth={auth} currentView="creator" onNavigate={onNavigate}>
        <main className={styles.page}>
          <Navbar auth={auth} currentView="creator" {...navFilters} onNavigate={onNavigate} />
        <section className={styles.emptyState}>
          <span>Area de creador</span>
          <h1>Inicia sesion para administrar tus historias</h1>
          <p>
            El home sigue centrado en lectura. Tu panel de creador vive aparte,
            con herramientas para publicar y editar.
          </p>
          <button onClick={() => onNavigate("home")} type="button">
            Volver al inicio
          </button>
        </section>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell auth={auth} currentView="creator" onNavigate={onNavigate}>
      <main className={styles.page}>
        <Navbar auth={auth} currentView="creator" {...navFilters} onNavigate={onNavigate} />

        <section className={styles.workspaceCard}>
          <div className={styles.modeSwitch}>
            <button
              className={`${styles.modeButton} ${
                creatorMode === "stories" ? styles.modeButtonActive : ""
              }`}
              onClick={() => {
                setCreatorMode("stories");
                setIllustrationActionMessage("");
                setPendingDeleteIllustrationId("");
                setShowIllustrationComposer(false);
              }}
              type="button"
            >
              Historias
            </button>
            <button
              className={`${styles.modeButton} ${
                creatorMode === "illustrations" ? styles.modeButtonActive : ""
              }`}
              onClick={() => {
                setCreatorMode("illustrations");
                setChapterActionMessage("");
                setPendingDeleteChapterId("");
                setShowChapterComposer(false);
                setShowStoryComposer(false);
              }}
              type="button"
            >
              Ilustraciones
            </button>
          </div>

          {creatorMode === "stories" ? (
            <>
              <section className={styles.hero}>
                <div className={styles.heroContent}>
                  <span>Panel de creador</span>
                  <h1>Administra tus historias y sigue publicando capitulos.</h1>
                  {selectedStory ? (
                    <div className={styles.heroSelectedStory}>
                      <strong>{selectedStory.title}</strong>
                      <small>
                        {publishedChapters.length} publicados y {draftChapters.length} en
                        borrador
                      </small>
                    </div>
                  ) : null}
                </div>
                <div className={styles.heroActions}>
                  <button
                    className={styles.primaryAction}
                    onClick={() => {
                      setShowStoryComposer((current) => !current);
                      setChapterActionMessage("");
                      setPendingDeleteChapterId("");
                    }}
                    type="button"
                  >
                    {showStoryComposer ? "Ocultar creador" : "Crear historia"}
                  </button>
                </div>
              </section>

              {showStoryComposer ? (
                <section className={styles.editorGrid}>
                  <CreatorStudio
                    auth={auth}
                    stories={stories}
                    selectedStoryId={selectedStoryId}
                    mode="story"
                    onChapterCreated={(chapter) => {
                      if (chapter.story_id === selectedStoryId) {
                        setChapters((current) => [...current, chapter]);
                        setSelectedChapterId(chapter.id);
                      }
                    }}
                    onStoryCreated={async (story) => {
                      const nextStories = [story, ...stories];
                      setStories(nextStories);
                      setSelectedStoryId(story.id);
                      setChapters([]);
                      setSelectedChapterId("");
                      setShowStoryComposer(false);
                      setShowChapterComposer(true);
                    }}
                  />
                </section>
              ) : null}

              <section className={styles.library}>
                <div className={styles.libraryHeader}>
                  <div>
                    <span>Tu biblioteca</span>
                    <h2>Historias creadas</h2>
                  </div>
                  <p className={styles.libraryCount}>
                    {status === "ready"
                      ? `${stories.length} historias en tu cuenta`
                      : "Cargando historias del creador"}
                  </p>
                </div>

                {stories.length === 0 ? (
                  <div className={styles.emptyCard}>
                    <strong>Aun no has publicado historias</strong>
                    <p>Crea tu primera historia y luego podras agregar capitulos.</p>
                  </div>
                ) : (
                  <div className={styles.storyGrid}>
                    {stories.map((story) => {
                      const ratingValue = clampRating(story.ratingAverage || 0);
                      const isSelected = selectedStoryId === story.id;

                      return (
                        <button
                          key={story.id}
                          className={`${styles.storyCard} ${
                            isSelected ? styles.activeStory : ""
                          }`}
                          onClick={() => setSelectedStoryId(story.id)}
                          type="button"
                        >
                          <img
                            className={styles.storyCoverImage}
                            src={story.cover}
                            alt={story.title}
                          />
                          <div className={styles.storyCardBody}>
                            <div className={styles.storyCardTopline}>
                              <strong>{story.title}</strong>
                              <span className={styles.categoryBadge}>{story.category}</span>
                            </div>
                            <p className={styles.storySynopsis}>
                              "{story.description || "Sin sinopsis todavia."}"
                            </p>
                            <div className={styles.storyAuthorRow}>
                              <span className={styles.storyAvatar}>
                                {story.authorAvatarUrl ? (
                                  <img
                                    alt={story.author || "Autor"}
                                    className={styles.storyAvatarImage}
                                    src={story.authorAvatarUrl}
                                  />
                                ) : (
                                  (story.author || "A").slice(0, 1).toUpperCase()
                                )}
                              </span>
                              <small>{story.author || "Autor de Valoria"}</small>
                            </div>
                            <div className={styles.storyMetaRow}>
                              <div className={styles.storyRating}>
                                <StarRating value={ratingValue} size="sm" icon="heart" />
                                <small>{story.ratingCount || 0} reseñas</small>
                              </div>
                              <small>{story.reads || 0} lecturas</small>
                            </div>
                            <div className={styles.storyFooter}>
                              <span
                                className={`${styles.storyStatus} ${
                                  story.status === "published"
                                    ? styles.storyStatusPublished
                                    : styles.storyStatusDraft
                                }`}
                              >
                                {story.status === "published" ? "Publicado" : "Borrador"}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {selectedStory ? (
                  <div className={styles.chapterNumbersWrap}>
                    <div className={styles.inlineChapterHeader}>
                      <span>Capitulos</span>
                      <div className={styles.chapterActions}>
                        <small className={styles.chapterSummary}>
                          {publishedChapters.length} publicados en {selectedStory.title}
                        </small>
                        <small className={styles.chapterSummaryMuted}>
                          {draftChapters.length} en borrador
                        </small>
                      </div>
                    </div>

                    {chapters.length > 0 ? (
                      <div className={styles.chapterColumns}>
                        <div className={styles.chapterGroup}>
                          <div className={styles.chapterGroupHeader}>
                            <span>Publicados</span>
                            <small>{publishedChapters.length}</small>
                          </div>
                          {publishedChapters.length > 0 ? (
                            <div className={styles.chapterNumberRow}>
                              {publishedChapters.map((chapter, index) => (
                                <button
                                  key={chapter.id}
                                  className={`${styles.chapterNumberPill} ${
                                    selectedChapterId === chapter.id
                                      ? styles.activeChapterPill
                                      : ""
                                  }`}
                                  onClick={() => {
                                    setSelectedChapterId(chapter.id);
                                    setEditingChapterId("");
                                    setChapterActionMessage("");
                                    setPendingDeleteChapterId("");
                                  }}
                                  type="button"
                                >
                                  Cap {chapter.chapter_number || index + 1}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <p className={styles.inlineChapterEmpty}>
                              Aun no hay capitulos publicados.
                            </p>
                          )}
                        </div>

                        <div className={styles.chapterGroup}>
                          <div className={styles.chapterGroupHeader}>
                            <span>Borradores</span>
                            <small>{draftChapters.length}</small>
                          </div>
                          {draftChapters.length > 0 ? (
                            <div className={styles.chapterNumberRow}>
                              {draftChapters.map((chapter, index) => (
                                <button
                                  key={chapter.id}
                                  className={`${styles.chapterNumberPill} ${
                                    selectedChapterId === chapter.id
                                      ? styles.activeChapterPill
                                      : ""
                                  } ${styles.draftChapterPill}`}
                                  onClick={() => {
                                    setSelectedChapterId(chapter.id);
                                    setEditingChapterId("");
                                    setChapterActionMessage("");
                                    setPendingDeleteChapterId("");
                                  }}
                                  type="button"
                                >
                                  Cap {chapter.chapter_number || index + 1}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <p className={styles.inlineChapterEmpty}>
                              No tienes borradores abiertos.
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className={styles.inlineChapterEmpty}>
                        Esta historia aun no tiene capitulos publicados.
                      </p>
                    )}

                    {selectedChapter ? (
                      <div className={styles.heroDetailStrip}>
                        <div>
                          <span>Capitulo activo</span>
                          <strong>{selectedChapter.title}</strong>
                          <p>
                            {selectedChapter.excerpt || "Este capitulo aun no tiene resumen."}
                          </p>
                        </div>
                        <div className={styles.chapterInspectorActions}>
                          <span
                            className={`${styles.storyStatus} ${
                              selectedChapter.status === "published"
                                ? styles.storyStatusPublished
                                : styles.storyStatusDraft
                            }`}
                          >
                            {selectedChapter.status === "published"
                              ? "Publicado"
                              : "Borrador"}
                          </span>
                          <button
                            className={styles.secondaryAction}
                            onClick={() => {
                              setShowChapterComposer((current) => !current);
                              setEditingChapterId("");
                              setChapterActionMessage("");
                              setPendingDeleteChapterId("");
                            }}
                            type="button"
                          >
                            {showChapterComposer && !editingChapterId
                              ? "Ocultar capitulo"
                              : "Agregar capitulo"}
                          </button>
                          <button
                            className={styles.secondaryAction}
                            onClick={() => {
                              setEditingChapterId(selectedChapter.id);
                              setShowChapterComposer(true);
                              setChapterActionMessage("");
                              setPendingDeleteChapterId("");
                            }}
                            type="button"
                          >
                            Modificar capitulo
                          </button>
                          {selectedChapter.status !== "published" ? (
                            <button
                              className={styles.publishAction}
                              onClick={() => handlePublishChapter(selectedChapter)}
                              type="button"
                            >
                              Publicar capitulo
                            </button>
                          ) : null}
                          <button
                            className={styles.dangerAction}
                            onClick={() => {
                              setPendingDeleteChapterId(selectedChapter.id);
                              setChapterActionMessage("");
                            }}
                            type="button"
                          >
                            Eliminar capitulo
                          </button>
                        </div>
                      </div>
                    ) : chapters.length === 0 ? (
                      <div className={styles.heroDetailStrip}>
                        <div>
                          <span>Capitulo activo</span>
                          <strong>Tu historia aun no tiene capitulos</strong>
                          <p>
                            Abre el formulario para crear el primer capitulo o deja uno
                            guardado como borrador.
                          </p>
                        </div>
                      </div>
                    ) : null}

                    {pendingDeleteChapter ? (
                      <div className={styles.deletePrompt}>
                        <div>
                          <span>Confirmar eliminacion</span>
                          <strong>
                            {chapters.length > 1
                              ? `Vas a borrar Cap ${pendingDeleteChapter.chapter_number}: ${pendingDeleteChapter.title}`
                              : `Vas a borrar el unico capitulo: ${pendingDeleteChapter.title}`}
                          </strong>
                          <p>
                            {chapters.length > 1
                              ? "Si en realidad quieres eliminar toda la historia, puedes hacerlo desde aqui mismo."
                              : "Como esta historia solo tiene un capitulo, tambien puedes optar por eliminar la historia completa."}
                          </p>
                        </div>
                        <div className={styles.deletePromptActions}>
                          <button
                            className={styles.dangerAction}
                            onClick={async () => {
                              try {
                                await deleteChapter(
                                  selectedStoryId,
                                  pendingDeleteChapter.id,
                                  auth.token
                                );
                                const nextChapters = chapters.filter(
                                  (chapter) => chapter.id !== pendingDeleteChapter.id
                                );
                                setChapters(nextChapters);
                                setSelectedChapterId(nextChapters[0]?.id || "");
                                setPendingDeleteChapterId("");
                                setEditingChapterId("");
                                setShowChapterComposer(false);
                                setChapterActionMessage("Capitulo eliminado.");
                              } catch (error) {
                                setChapterActionMessage(error.message);
                              }
                            }}
                            type="button"
                          >
                            Eliminar este capitulo
                          </button>
                          <button
                            className={styles.publishAction}
                            onClick={async () => {
                              try {
                                await deleteStory(selectedStoryId, auth.token);
                                const nextStories = stories.filter(
                                  (story) => story.id !== selectedStoryId
                                );
                                setStories(nextStories);
                                setSelectedStoryId(nextStories[0]?.id || "");
                                setChapters([]);
                                setSelectedChapterId("");
                                setPendingDeleteChapterId("");
                                setEditingChapterId("");
                                setShowChapterComposer(false);
                                setChapterActionMessage("Historia eliminada.");
                              } catch (error) {
                                setChapterActionMessage(error.message);
                              }
                            }}
                            type="button"
                          >
                            Eliminar historia
                          </button>
                          <button
                            className={styles.secondaryAction}
                            onClick={() => setPendingDeleteChapterId("")}
                            type="button"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {chapterActionMessage ? (
                      <p className={styles.chapterActionMessage}>{chapterActionMessage}</p>
                    ) : null}
                  </div>
                ) : null}
              </section>
            </>
          ) : (
            <>
              <section className={styles.hero}>
                <div className={styles.heroContent}>
                  <span>Panel de ilustrador</span>
                  <h1>Organiza tus piezas visuales y construye tu galeria publica.</h1>
                  {selectedIllustration ? (
                    <div className={styles.heroSelectedStory}>
                      <strong>{selectedIllustration.title}</strong>
                      <small>
                        {publishedIllustrations.length} publicadas y {draftIllustrations.length} en
                        borrador
                      </small>
                    </div>
                  ) : null}
                </div>
                <div className={styles.heroActions}>
                  <button
                    className={styles.primaryAction}
                    onClick={() => {
                      setShowIllustrationComposer((current) => !current);
                      setEditingIllustrationId("");
                      setIllustrationActionMessage("");
                      setPendingDeleteIllustrationId("");
                    }}
                    type="button"
                  >
                    {showIllustrationComposer ? "Ocultar atelier" : "Crear ilustracion"}
                  </button>
                </div>
              </section>

              <section className={styles.library}>
                <div className={styles.libraryHeader}>
                  <div>
                    <span>Tu galeria</span>
                    <h2>Ilustraciones creadas</h2>
                  </div>
                  <p className={styles.libraryCount}>
                    {illustrations.length} piezas en tu portafolio
                  </p>
                </div>

                {illustrations.length === 0 ? (
                  <div className={styles.emptyCard}>
                    <strong>Aun no has publicado ilustraciones</strong>
                    <p>Crea tu primera pieza para empezar a poblar la galeria visual.</p>
                  </div>
                ) : (
                  <div className={styles.storyGrid}>
                    {illustrations.map((illustration) => {
                      const isSelected = selectedIllustrationId === illustration.id;

                      return (
                        <button
                          key={illustration.id}
                          className={`${styles.storyCard} ${
                            isSelected ? styles.activeStory : ""
                          }`}
                          onClick={() => {
                            setSelectedIllustrationId(illustration.id);
                            setEditingIllustrationId("");
                            setIllustrationActionMessage("");
                            setPendingDeleteIllustrationId("");
                          }}
                          type="button"
                        >
                          <img
                            className={styles.illustrationCoverImage}
                            src={illustration.coverUrl}
                            alt={illustration.title}
                          />
                          <div className={styles.storyCardBody}>
                            <div className={styles.storyCardTopline}>
                              <strong>{illustration.title}</strong>
                              <div className={styles.badgeStack}>
                                {(illustration.categories || []).slice(0, 2).map((category) => (
                                  <span
                                    key={`${illustration.id}-${category}`}
                                    className={styles.categoryBadge}
                                  >
                                    {category}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <p className={styles.storySynopsis}>
                              "{illustration.description || "Sin descripcion todavia."}"
                            </p>
                            <div className={styles.storyAuthorRow}>
                              <span className={styles.storyAvatar}>
                                {illustration.authorAvatarUrl ? (
                                  <img
                                    alt={illustration.author || "Ilustrador"}
                                    className={styles.storyAvatarImage}
                                    src={illustration.authorAvatarUrl}
                                  />
                                ) : (
                                  (illustration.author || "I").slice(0, 1).toUpperCase()
                                )}
                              </span>
                              <small>{illustration.author || "Ilustrador de Valoria"}</small>
                            </div>
                            <div className={styles.storyMetaRow}>
                              <small>{illustration.likesCount || 0} me gusta</small>
                              <small>{illustration.commentsCount || 0} comentarios</small>
                              <small>{illustration.viewsCount || 0} vistas</small>
                            </div>
                            <div className={styles.storyFooter}>
                              <span
                                className={`${styles.storyStatus} ${
                                  illustration.status === "published"
                                    ? styles.storyStatusPublished
                                    : styles.storyStatusDraft
                                }`}
                              >
                                {illustration.status === "published" ? "Publicado" : "Borrador"}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {selectedIllustration ? (
                  <div className={styles.heroDetailStrip}>
                    <div>
                      <span>Ilustracion activa</span>
                      <strong>{selectedIllustration.title}</strong>
                      <p>
                        {selectedIllustration.description ||
                          "Esta pieza aun no tiene descripcion visible."}
                      </p>
                    </div>
                    <div className={styles.chapterInspectorActions}>
                      <span
                        className={`${styles.storyStatus} ${
                          selectedIllustration.status === "published"
                            ? styles.storyStatusPublished
                            : styles.storyStatusDraft
                        }`}
                      >
                        {selectedIllustration.status === "published" ? "Publicado" : "Borrador"}
                      </span>
                      <button
                        className={styles.secondaryAction}
                        onClick={() =>
                          onNavigate("illustration-detail", {
                            illustrationIdentifier:
                              selectedIllustration.slug || selectedIllustration.id
                          })
                        }
                        type="button"
                      >
                        Abrir ilustracion
                      </button>
                      <button
                        className={styles.secondaryAction}
                        onClick={() => {
                          setEditingIllustrationId(selectedIllustration.id);
                          setShowIllustrationComposer(true);
                          setIllustrationActionMessage("");
                          setPendingDeleteIllustrationId("");
                        }}
                        type="button"
                      >
                        Modificar ilustracion
                      </button>
                      <button
                        className={styles.dangerAction}
                        onClick={() => {
                          setPendingDeleteIllustrationId(selectedIllustration.id);
                          setIllustrationActionMessage("");
                        }}
                        type="button"
                      >
                        Eliminar ilustracion
                      </button>
                    </div>
                  </div>
                ) : null}

                {pendingDeleteIllustration ? (
                  <div className={styles.deletePrompt}>
                    <div>
                      <span>Confirmar eliminacion</span>
                      <strong>Vas a borrar la ilustracion {pendingDeleteIllustration.title}</strong>
                      <p>La pieza dejara de aparecer en tu galeria y en la vista publica.</p>
                    </div>
                    <div className={styles.deletePromptActions}>
                      <button
                        className={styles.dangerAction}
                        onClick={async () => {
                          try {
                            await deleteIllustration(pendingDeleteIllustration.id, auth.token);
                            const nextIllustrations = illustrations.filter(
                              (illustration) =>
                                illustration.id !== pendingDeleteIllustration.id
                            );
                            setIllustrations(nextIllustrations);
                            setSelectedIllustrationId(nextIllustrations[0]?.id || "");
                            setEditingIllustrationId("");
                            setPendingDeleteIllustrationId("");
                            setShowIllustrationComposer(false);
                            setIllustrationActionMessage("Ilustracion eliminada.");
                          } catch (error) {
                            setIllustrationActionMessage(error.message);
                          }
                        }}
                        type="button"
                      >
                        Eliminar ilustracion
                      </button>
                      <button
                        className={styles.secondaryAction}
                        onClick={() => setPendingDeleteIllustrationId("")}
                        type="button"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : null}

                {illustrationActionMessage ? (
                  <p className={styles.chapterActionMessage}>{illustrationActionMessage}</p>
                ) : null}
              </section>
            </>
          )}
        </section>

        {creatorMode === "stories" && showChapterComposer && selectedStory ? (
          <section className={styles.editorGrid} ref={chapterComposerRef}>
            <CreatorStudio
              auth={auth}
              existingChapters={chapters}
              stories={stories}
              selectedStoryId={selectedStoryId}
              chapterDraft={editingChapter}
              mode="chapter"
              onChapterCreated={(chapter) => {
                if (chapter.story_id === selectedStoryId) {
                  setChapters((current) => [...current, chapter]);
                  setSelectedChapterId(chapter.id);
                }
                if (chapter.status === "published") {
                  setStories((current) =>
                    current.map((item) =>
                      item.id === chapter.story_id
                        ? { ...item, status: "published" }
                        : item
                    )
                  );
                }
                setEditingChapterId("");
                setPendingDeleteChapterId("");
                setShowChapterComposer(false);
                setChapterActionMessage("Capitulo creado.");
              }}
              onStoryUpdated={(story) => {
                setStories((current) =>
                  current.map((item) => (item.id === story.id ? { ...item, ...story } : item))
                );
              }}
              onChapterUpdated={(chapter) => {
                setChapters((current) =>
                  current.map((item) => (item.id === chapter.id ? chapter : item))
                );
                if (chapter.status === "published") {
                  setStories((current) =>
                    current.map((item) =>
                      item.id === chapter.story_id
                        ? { ...item, status: "published" }
                        : item
                    )
                  );
                }
                setSelectedChapterId(chapter.id);
                setEditingChapterId("");
                setPendingDeleteChapterId("");
                setShowChapterComposer(false);
                setChapterActionMessage("Capitulo actualizado.");
              }}
              onStoryCreated={() => {}}
            />
          </section>
        ) : null}

        {creatorMode === "illustrations" && showIllustrationComposer ? (
          <section className={styles.editorGrid} ref={illustrationComposerRef}>
            <IllustrationStudio
              auth={auth}
              illustrationDraft={editingIllustration}
              onIllustrationCreated={(illustration) => {
                const nextIllustrations = [illustration, ...illustrations];
                setIllustrations(nextIllustrations);
                setSelectedIllustrationId(illustration.id);
                setEditingIllustrationId("");
                setPendingDeleteIllustrationId("");
                setShowIllustrationComposer(false);
                setIllustrationActionMessage("Ilustracion creada.");
                onNavigate("illustration-detail", {
                  illustrationIdentifier: illustration.slug || illustration.id
                });
              }}
              onIllustrationUpdated={(illustration) => {
                setIllustrations((current) =>
                  current.map((item) => (item.id === illustration.id ? illustration : item))
                );
                setSelectedIllustrationId(illustration.id);
                setEditingIllustrationId("");
                setPendingDeleteIllustrationId("");
                setShowIllustrationComposer(false);
                setIllustrationActionMessage("Ilustracion actualizada.");
              }}
            />
          </section>
        ) : null}
      </main>
    </AppShell>
  );
}
