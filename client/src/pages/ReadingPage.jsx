import {StoryFollowing} from '../components/stories/StoryFollowing';
import {ContentGate} from '../components/common/ContentWarnings';
import {ActivityState} from '../components/common/ActivityState';
import { ui } from "../i18n/runtime.js";
import {ReaderNotes} from '../components/stories/ReaderNotes';
import {ShareWork} from '../components/common/ShareWork';
import {WorkDetailsPublic} from '../components/stories/WorkDetails';
import { saveOfflineWork } from '../utils/offlineReading';
import { ReportDialog } from "../components/common/ReportDialog";
import { BookReader } from "../components/stories/BookReader";
import { ReadingSettings, readReadingSettings } from "../components/stories/ReadingSettings";
import { LibraryControls } from "../components/common/LibraryControls";
import { loadLibrary, readLibrary, saveLibraryItem } from "../utils/library";
// Hoja de lectura de una historia concreta.
// Muestra portada, capitulos, contenido y reseñas al final.
import { useEffect, useState } from "react";
import {
  addChapterIllustration,
  createStoryReview,
  fetchStoryChapters,
  fetchStoryReviews,
  likeStoryReview,
  replyToStoryReview,
  registerStoryRead,
  uploadChapterImage
} from "../api/storyApi";
import { StarRating } from "../components/common/StarRating";
import { Navbar } from "../components/layout/Navbar";
import {
  buildFallbackChapters,
  buildFallbackReviews,
  isPersistedStory,
  normalizeStoryForReading
} from "../utils/storyMocks";
import { contentBlocks } from "../utils/richContent";
import { clampRating } from "../utils/ratings";
import { readChapterIndex, saveReadingProgress } from "../utils/readingProgress";
import { AppShell } from "../components/layout/AppShell";
import styles from "../styles/ReadingPage.module.css";

const REVIEW_LIKES_KEY = "valoria-review-likes";

function readLikedReviews(userId) {
  if (!userId) {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(REVIEW_LIKES_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed[userId] || {};
  } catch {
    return {};
  }
}

function persistLikedReview(userId, reviewId) {
  if (!userId) {
    return;
  }

  try {
    const raw = window.localStorage.getItem(REVIEW_LIKES_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const next = {
      ...parsed,
      [userId]: {
        ...(parsed[userId] || {}),
        [reviewId]: true
      }
    };
    window.localStorage.setItem(REVIEW_LIKES_KEY, JSON.stringify(next));
  } catch {}
}

export function ReadingPage({ auth, navFilters, onNavigate, story }) {
  const [reportTarget,setReportTarget]=useState(null);
  const [reportMessage,setReportMessage]=useState("");
  const [readingSettings,setReadingSettings] = useState(readReadingSettings);
  const [containsSpoilers,setContainsSpoilers] = useState(false);
  const persistedStory = isPersistedStory(story);
  const [storyState, setStoryState] = useState(normalizeStoryForReading(story));
  const [offlineMessage,setOfflineMessage]=useState('');
  const [chapters, setChapters] = useState(
    persistedStory ? [] : buildFallbackChapters(story)
  );
  const [reviews, setReviews] = useState(
    persistedStory ? [] : buildFallbackReviews(story)
  );
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [status, setStatus] = useState("loading");
  const [contentAllowed,setContentAllowed]=useState(false);
  const [loadRequest, setLoadRequest] = useState(0);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    reviewText: ""
  });
  const [replyDrafts, setReplyDrafts] = useState({});
  const [replyingTo, setReplyingTo] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");
  const [readingMode, setReadingMode] = useState("standard");
  const [communityImage, setCommunityImage] = useState(null);
  const [communityMessage, setCommunityMessage] = useState("");
  const [selectedIllustration, setSelectedIllustration] = useState(null);
  const activeChapter = chapters[activeChapterIndex] || chapters[0];

  async function loadReviews(storyId, chapterId, persisted) {
    try {
      const data = await fetchStoryReviews(storyId, auth.token, chapterId);
      const likedReviews = readLikedReviews(auth.user?.id);
      const decorate = (review) => ({
        ...review,
        likedByCurrentUser:
          Boolean(review.likedByCurrentUser) || Boolean(likedReviews[review.id]),
        replies: (review.replies || []).map(decorate)
      });
      setReviews(data.reviews.map(decorate));
      return;
    } catch (error) {}

    setReviews(persisted ? [] : buildFallbackReviews(story));
  }

  useEffect(() => {
    setStoryState(normalizeStoryForReading(story));
  }, [story]);

  useEffect(() => {
    let active = true;
    setStatus("loading");
    setChapters([]);

    async function loadChapters() {
      try {
        const data = await fetchStoryChapters(story.id, auth.token);

        if (active && data.chapters.length > 0) {
          const library = await loadLibrary(auth).catch(()=>readLibrary(auth.user?.id));
          if(!active)return;
          const savedChapter = data.chapters.findIndex(chapter=>chapter.id===library[story.id]?.chapterId);
          setChapters(data.chapters);
          setActiveChapterIndex(savedChapter>=0 ? savedChapter : readChapterIndex(story.id, auth.user?.id, data.chapters));
          setStatus("ready");
          return;
        }

        if (active) {
          const nextChapters = persistedStory ? [] : buildFallbackChapters(story);
          setChapters(nextChapters);
          setActiveChapterIndex(readChapterIndex(story.id, auth.user?.id, nextChapters));
          setStatus(persistedStory ? "ready" : "fallback");
        }
      } catch (error) {
        if (active) {
          const nextChapters = persistedStory ? [] : buildFallbackChapters(story);
          setChapters(nextChapters);
          setActiveChapterIndex(readChapterIndex(story.id, auth.user?.id, nextChapters));
          setStatus(persistedStory ? "error" : "fallback");
        }
      }
    }

    loadChapters();

    return () => {
      active = false;
    };
  }, [persistedStory, story.id, auth.token, auth.user?.id, loadRequest]);

  useEffect(() => {
    if (contentAllowed && (status === "ready" || status === "fallback")) {
      saveReadingProgress(story.id, auth.user?.id, activeChapter?.id);
      if(activeChapter?.id) {
        const previous=readLibrary(auth.user?.id)[story.id]||{};
        saveLibraryItem(auth,story.id,{id:story.id,type:'story',category:story.category,title:story.title,slug:story.slug,cover:story.cover||story.cover_url,author:story.author,status:previous.status||'reading',chapterId:activeChapter.id,chapterTitle:activeChapter.title,firstReadAt:previous.firstReadAt||new Date().toISOString(),lastReadAt:new Date().toISOString(),readDays:[...new Set([...(previous.readDays||[]),new Date().toISOString().slice(0,10)])].slice(-90),chaptersVisited:[...new Set([...(previous.chaptersVisited||[]),activeChapter.id])]}).catch(()=>{});
      }
    }
  }, [story.id, auth.user?.id, activeChapter?.id, status,contentAllowed]);

  useEffect(() => {
    let active = true;

    async function syncReviews() {
      if (!activeChapter?.id && persistedStory) {
        if (active) {
          setReviews([]);
        }
        return;
      }

      try {
        const data = await fetchStoryReviews(
          story.id,
          auth.token,
          activeChapter?.id || ""
        );
        const likedReviews = readLikedReviews(auth.user?.id);
        const decorate = (review) => ({
          ...review,
          likedByCurrentUser:
            Boolean(review.likedByCurrentUser) ||
            Boolean(likedReviews[review.id]),
          replies: (review.replies || []).map(decorate)
        });
        if (active) {
          setReviews(data.reviews.map(decorate));
          return;
        }
      } catch (error) {}

      if (active) {
        setReviews(persistedStory ? [] : buildFallbackReviews(story));
      }
    }

    syncReviews();

    return () => {
      active = false;
    };
  }, [activeChapter?.id, auth.token, persistedStory, story]);

  useEffect(() => {
    setReplyingTo("");
    setReviewMessage("");
  }, [activeChapterIndex]);

  useEffect(() => {
    let active = true;

    async function persistRead() {
      const key=`valoria-visit:${auth.user?.id||'guest'}:${story.id}`;
      try {if(Date.now()-Number(sessionStorage.getItem(key)||0)<1800000)return;}catch{}
      try {
        const data = await registerStoryRead(story.id, auth.token);
        try{sessionStorage.setItem(key,String(Date.now()));}catch{}

        if (active && data.story) {
          setStoryState(normalizeStoryForReading(data.story));
        }
      } catch (error) {
        // Algunas historias del home son ficticias; en esos casos ignoramos.
      }
    }

    persistRead();

    return () => {
      active = false;
    };
  }, [story.id, auth.token]);

  const hasPreviousChapter = activeChapterIndex > 0;
  const hasNextChapter = activeChapterIndex < chapters.length - 1;
  const chapterParagraphs = activeChapter
    ? contentBlocks(activeChapter?.content || "")
    : [];
  const creatorIllustrations = (activeChapter?.chapter_images || []).filter(
    (image) => (image.image_role || image.imageRole || "creator") === "creator"
  );
  const communityIllustrations = (activeChapter?.chapter_images || []).filter(
    (image) => (image.image_role || image.imageRole) === "community"
  );
  const chapterIllustration =
    creatorIllustrations[0]?.public_url || creatorIllustrations[0]?.publicUrl || "";
  const averageRating =
    clampRating(
      reviews.length > 0
        ? reviews.reduce((sum, review) => sum + Number(review.rating), 0) /
            reviews.length
        : storyState.ratingAverage
    );
  async function handleReviewSubmit(event) {
    event.preventDefault();
    setReviewMessage("");

    const payload = {
      rating: Number(reviewForm.rating),
      reviewText: `${containsSpoilers ? "[spoiler]" : ""}${reviewForm.reviewText}`,
      chapterId: activeChapter?.id || null,
      reviewerName: auth.user?.displayName || "Lector invitado"
    };

    try {
      if (!auth.isAuthenticated) {
        throw new Error("Debes iniciar sesion para dejar una reseña");
      }

      await createStoryReview(story.id, payload, auth.token);
      await loadReviews(story.id, activeChapter?.id || "", persistedStory);
      setReviewForm({
        rating: 5,
        reviewText: ""
      });
      setReviewMessage("Reseña publicada.");
    } catch (error) {
      setReviewMessage(error.message);
    }
  }

  async function handleReviewLike(reviewId) {
    try {
      if (!auth.isAuthenticated) {
        throw new Error("Debes iniciar sesion para reaccionar a una reseña");
      }

      const result = await likeStoryReview(story.id, reviewId, auth.token);
      persistLikedReview(auth.user?.id, reviewId);
      await loadReviews(story.id, activeChapter?.id || "", persistedStory);
      setReviewMessage(
        result.alreadyLiked
          ? "Ya habias marcado esta reseña."
          : "Te gusto esta reseña."
      );
    } catch (error) {
      setReviewMessage(error.message);
    }
  }

  async function handleReplySubmit(reviewId) {
    try {
      if (!auth.isAuthenticated) {
        throw new Error("Debes iniciar sesion para responder una reseña");
      }

      const reviewText = (replyDrafts[reviewId] || "").trim();

      if (!reviewText) {
        throw new Error("Escribe una respuesta antes de enviarla");
      }

      await replyToStoryReview(
        story.id,
        reviewId,
        {
          reviewText,
          chapterId: activeChapter?.id || null,
          reviewerName: auth.user?.displayName || "Lector invitado"
        },
        auth.token
      );

      await loadReviews(story.id, activeChapter?.id || "", persistedStory);
      setReplyDrafts((current) => ({
        ...current,
        [reviewId]: ""
      }));
      setReplyingTo("");
      setReviewMessage("Respuesta publicada.");
    } catch (error) {
      setReviewMessage(error.message);
    }
  }

  async function handleCommunityIllustrationSubmit(event) {
    event.preventDefault();
    setCommunityMessage("");

    try {
      if (!auth.isAuthenticated) {
        throw new Error("Debes iniciar sesion para compartir una ilustracion");
      }

      if (!communityImage || !activeChapter?.id) {
        throw new Error("Selecciona una imagen para este capitulo");
      }

      const upload = await uploadChapterImage(
        communityImage,
        activeChapter?.title || "Ilustracion de la comunidad",
        auth.token
      );

      await addChapterIllustration(
        story.id,
        activeChapter.id,
        {
          publicUrl: upload.file.publicUrl,
          storagePath: upload.file.storagePath,
          altText: upload.file.altText || activeChapter?.title,
          imageRole: "community"
        },
        auth.token
      );

      const chapterData = await fetchStoryChapters(story.id, auth.token);
      setChapters(chapterData.chapters);
      setCommunityImage(null);
      setCommunityMessage("Ilustracion publicada para este capitulo.");
    } catch (error) {
      setCommunityMessage(error.message);
    }
  }

  function renderReview(review, depth = 0) {
    const isNested = depth > 0;

    return (
      <article
        key={review.id}
        className={`${styles.reviewCard} ${isNested ? styles.reviewCardNested : ""}`}
      >
        <div className={styles.reviewTop}>
          <strong>{review.reviewerName || review.reviewer_name}</strong>
          {review.rating ? (
            <StarRating
              value={Number(review.rating || 0)}
              size="sm"
              icon="heart"
            />
          ) : null}
        </div>
        {String(review.review_text || review.reviewText).startsWith("[spoiler]") ? <details><summary>{ui("Esta reseña contiene spoilers")}</summary><p>{String(review.review_text || review.reviewText).slice(9)}</p></details> : <p>{review.review_text || review.reviewText}</p>}
        <div className={styles.reviewActions}>
          <button
            className={styles.reviewActionButton}
            onClick={() => handleReviewLike(review.id)}
            type="button"
            disabled={review.likedByCurrentUser}
          >
            {review.likedByCurrentUser ? ui("Te gusta") : ui("Me gusta")} · {review.likesCount || 0}
          </button>
          <button
            className={styles.reviewActionButton}
            onClick={() =>
              setReplyingTo((current) => (current === review.id ? "" : review.id))
            }
            type="button"
          >{ui(" Responder ")}</button>
        </div>

        {review.replies?.length ? (
          <div className={styles.replyList}>
            {review.replies.map((reply) => renderReview(reply, depth + 1))}
          </div>
        ) : null}

        {replyingTo === review.id ? (
          <div className={styles.replyComposer}>
            <textarea
              rows="3"
              value={replyDrafts[review.id] || ""}
              onChange={(event) =>
                setReplyDrafts((current) => ({
                  ...current,
                  [review.id]: event.target.value
                }))
              }
              placeholder={ui("Escribe una respuesta dentro de esta reseña")}
            />
            <button
              className={styles.replySubmitButton}
              onClick={() => handleReplySubmit(review.id)}
              type="button"
            >{ui(" Enviar respuesta ")}</button>
          </div>
        ) : null}
      </article>
    );
  }

  return (
    <AppShell auth={auth} currentView="reading" onNavigate={onNavigate}>
      <main className={styles.page}>
        <Navbar auth={auth} currentView="reading" {...navFilters} onNavigate={onNavigate} />
        <ContentGate key={story.id} work={story} type="story" auth={auth} onNavigate={onNavigate} onAccessChange={setContentAllowed}>

      <section className={styles.hero}>
        <img src={storyState.cover || "/default-cover.svg"} onError={(event) => { if (!event.currentTarget.src.endsWith("/default-cover.svg")) event.currentTarget.src = "/default-cover.svg"; }} alt={storyState.title} />

        <div className={styles.storyMeta}>
          <div className={styles.storyTopline}>
            <h1>{storyState.title}</h1>
            <span className={styles.categoryBadge}>{storyState.category}</span>
          </div>
          <p className={styles.synopsis}>"{storyState.description}"</p>

          <div className={styles.authorRow}>
            <span className={styles.authorAvatar}>
              {storyState.authorAvatarUrl ? (
                <img
                  alt={storyState.author || ui("Autor")}
                  className={styles.authorAvatarImage}
                  src={storyState.authorAvatarUrl}
                />
              ) : (
                (storyState.author || "A").slice(0, 1).toUpperCase()
              )}
            </span>
            <div>
              <button
                className={styles.authorLink}
                onClick={() =>
                  storyState.authorId
                    ? onNavigate("creator-profile", { profileId: storyState.authorId })
                    : null
                }
                type="button"
              >
                {storyState.author}
              </button>
              <small>{ui("Creador de la historia")}</small>
            </div>
          </div>

          <div className={styles.storyStatsRow}>
            <div className={styles.storyRating}>
              <StarRating value={averageRating} size="lg" icon="heart" />
            </div>
            <small>{storyState.reads}{ui(" lecturas")}</small>
            <small>{reviews.length}{ui(" reseñas")}</small>
          </div>

          <div className={styles.storyRatingMobile}>
            <StarRating value={averageRating} size="lg" icon="heart" />
            <span>{reviews.length}{ui(" reseñas")}</span>
          </div>
        </div>
      </section>

      {(Array.isArray(storyState.characters) && storyState.characters.length > 0 || Array.isArray(storyState.tags) && storyState.tags.length > 0) && <section className={styles.searchTerms} aria-label={ui("Personajes y etiquetas de la historia")}>
        {Array.isArray(storyState.characters) && storyState.characters.length > 0 && <div><strong>{ui("Personajes")}</strong>{storyState.characters.map((value) => <a key={value} href={`#/search?${new URLSearchParams({ q: value, type: "stories", field: "character" })}`}>{value}</a>)}</div>}
        {Array.isArray(storyState.tags) && storyState.tags.length > 0 && <div><strong>{ui("Etiquetas")}</strong>{storyState.tags.map((value) => <a key={value} href={`#/search?${new URLSearchParams({ q: value, type: "stories", field: "tag" })}`}>#{value}</a>)}</div>}
      </section>}
      <section className={styles.chapterStrip}>
        {chapters.map((chapter, index) => (
          <button
            key={chapter.id || `${chapter.title}-${index}`}
            className={`${styles.chapterPill} ${
              index === activeChapterIndex ? styles.chapterPillActive : ""
            }`}
            onClick={() => setActiveChapterIndex(index)}
            type="button"
          >
            <strong>{ui("Cap ")}{chapter.chapter_number || index + 1}</strong>
          </button>
        ))}
      </section>

      <section className={styles.readerWrap}>
        {status === "error" ? (
          <ActivityState kind="error" message="No se pudieron cargar los capitulos. Vuelve a intentarlo." action="Reintentar" onAction={()=>setLoadRequest(x=>x+1)}/>
        ) : null}
        {activeChapter && status !== "loading" ? (
          <p className={styles.progressNote} role="status">{ui(" Capitulo ")}{activeChapterIndex + 1}{ui(" de ")}{chapters.length}. {auth.token ? ui("Tu avance se sincroniza con tu cuenta.") : ui("Tu avance se guarda en este navegador.")}
          </p>
        ) : null}
        <div className={styles.publicationTools}>
          <LibraryControls auth={auth} work={story} onNavigate={onNavigate} /><StoryFollowing story={story} auth={auth} onNavigate={onNavigate}/>
          <button type="button" disabled={!chapters.length} onClick={()=>{try{saveOfflineWork(auth.user?.id,story,chapters);setOfflineMessage('Copia de texto guardada en este dispositivo. Encuéntrala en Sin conexión.');}catch(error){setOfflineMessage(error.message||'No hay espacio para guardar esta copia.');}}}>{ui("Guardar para leer sin conexión")}</button>
          {offlineMessage && <p role="status">{ui(offlineMessage)}</p>}
          <button className={styles.reportButton} type="button" onClick={()=>auth.token?setReportTarget({targetType:'story',targetId:story.id}):onNavigate('login')}>{ui("Denunciar publicación")}</button>
        </div>
        {reportMessage && <p role="status">{ui(reportMessage)}</p>}
        <ReadingSettings auth={auth} value={readingSettings} onChange={setReadingSettings} />
        {story.mature && <p role="note">{ui("Esta historia está marcada como contenido para adultos.")}</p>}
        <article data-reading-theme={readingSettings.theme} className={styles.reader} style={{'--reading-font':`${readingSettings.fontSize}px`,'--reading-line':readingSettings.lineHeight,'--reading-width':`${readingSettings.width}px`}}>
          <header className={styles.readerHeader}>
            <span>{ui(" Capitulo ")}{activeChapter?.chapter_number || activeChapterIndex + 1}
            </span>
            <h2>{activeChapter?.title}</h2>
            <div className={styles.readingModes}>
              <button
                className={`${styles.modeButton} ${
                  readingMode === "standard" ? styles.modeButtonActive : ""
                }`}
                onClick={() => setReadingMode("standard")}
                type="button"
              >{ui(" Lectura tradicional ")}</button>
              <button
                className={`${styles.modeButton} ${
                  readingMode === "book" ? styles.modeButtonActive : ""
                }`}
                onClick={() => setReadingMode("book")}
                type="button"
              >{ui(" Formato libro ")}</button>
            </div>
          </header>

          <div data-reader-text
            className={`${styles.readerContent} ${
              readingMode === "book" ? styles.readerContentBook : ""
            }`}
          >
            {activeChapter ? (
              readingMode === "book" ? (
                <BookReader chapterId={activeChapter.id} title={activeChapter.title} blocks={chapterParagraphs} image={chapterIllustration}/>
              ) : (
                chapterParagraphs.map((paragraph, index) => (
                  <div className={styles.richBlock} key={`${activeChapter?.id || "chapter"}-${index}`} dangerouslySetInnerHTML={{ __html: paragraph }} />
                ))
              )
            ) : (
              <ActivityState kind={status==='loading'?'loading':status==='error'?'error':'empty'} title={status==='loading'?'Cargando capitulos...':'Esta historia aun no tiene capitulos publicados.'} action="Explorar obras" onAction={()=>onNavigate('home')}/>
            )}
          </div>

          <div className={styles.chapterNav}>
            {hasPreviousChapter ? (
              <button
                className={styles.navButton}
                onClick={() => setActiveChapterIndex((current) => current - 1)}
                type="button"
              >{ui(" Capitulo anterior ")}</button>
            ) : (
              <span />
            )}

            {hasNextChapter ? (
              <button
                className={styles.navButton}
                onClick={() => setActiveChapterIndex((current) => current + 1)}
                type="button"
              >{ui(" Siguiente capitulo ")}</button>
            ) : null}
          </div>

          <div className={styles.readerTools}>
          {activeChapter&&<ReaderNotes key={`${auth.user?.id||'guest'}:${activeChapter.id}`} auth={auth} story={story} chapter={activeChapter}/>}
          <WorkDetailsPublic key={story.id} work={story} type="story" auth={auth} onNavigate={onNavigate} atEnd={!hasNextChapter}/>
          <ShareWork work={story}/>
          </div>
          <section className={styles.illustrationSection}>
            <div className={styles.illustrationHeader}>
              <span>{ui("Ilustracion del creador")}</span>
            </div>

            {creatorIllustrations.length > 0 ? (
              <div className={styles.illustrationGrid}>
                {creatorIllustrations.map((image) => (
                  <img
                    key={image.id}
                    className={styles.illustrationCard}
                    src={image.public_url || image.publicUrl}
                    alt={image.alt_text || image.altText || activeChapter?.title}
                    onClick={() => setSelectedIllustration(image)}
                  />
                ))}
              </div>
            ) : (
              <p className={styles.illustrationEmpty}>{ui(" Este capitulo aun no tiene ilustracion del creador. ")}</p>
            )}
          </section>

          <section className={styles.illustrationSection}>
            <div className={styles.illustrationHeader}>
              <span>{ui("Ilustraciones de la comunidad")}</span>
            </div>

            {communityIllustrations.length > 0 ? (
              <div className={styles.illustrationGrid}>
                {communityIllustrations.map((image) => (
                  <img
                    key={image.id}
                    className={styles.illustrationCard}
                    src={image.public_url || image.publicUrl}
                    alt={image.alt_text || image.altText || activeChapter?.title}
                    onClick={() => setSelectedIllustration(image)}
                  />
                ))}
              </div>
            ) : (
              <p className={styles.illustrationEmpty}>{ui(" La comunidad aun no ha compartido ilustraciones para este capitulo. ")}</p>
            )}

            <form
              className={styles.communityIllustrationForm}
              onSubmit={handleCommunityIllustrationSubmit}
            >
              <label>
                <span>{ui("Sube una ilustracion para este capitulo")}</span>
                <div className={styles.filePicker}>
                  <label className={styles.fileButton}>
                    <input
                      className={styles.fileInput}
                      type="file"
                      accept="image/*"
                      onChange={(event) =>
                        setCommunityImage(event.target.files?.[0] || null)
                      }
                    />{ui(" Elegir ilustracion ")}</label>
                  <small className={styles.fileName}>
                    {communityImage?.name || ui("Ningun archivo seleccionado")}
                  </small>
                </div>
              </label>
              <button type="submit">{ui("Compartir ilustracion")}</button>
              {communityMessage ? (
                <p className={styles.communityMessage}>{communityMessage}</p>
              ) : null}
            </form>
          </section>

          <section className={styles.reviewSection}>
            <div className={styles.reviewHeader}>
              <div>
                <span className={styles.reviewEyebrow}>{ui("Comunidad lectora")}</span>
                <h3>{ui("Que opinan los lectores")}</h3>
              </div>
              <div className={styles.storyRating}>
                <StarRating value={averageRating} icon="heart" />
                <span>{reviews.length}{ui(" reseñas")}</span>
              </div>
            </div>

            {reviewMessage ? (
              <p className={styles.reviewInlineMessage}>{ui(reviewMessage)}</p>
            ) : null}

            <div className={styles.reviewList}>
              {reviews.map((review) => renderReview(review))}
            </div>

            <form className={styles.reviewForm} onSubmit={handleReviewSubmit}>
              <div className={styles.reviewDivider} />
              <label>
                <span>{ui("Puntuacion")}</span>
                <select
                  value={reviewForm.rating}
                  onChange={(event) =>
                    setReviewForm((current) => ({
                      ...current,
                      rating: Number(event.target.value)
                    }))
                  }
                >
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <option key={rating} value={rating}>
                      {rating}{ui(" corazones ")}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>{ui("Tu reseña al terminar el capitulo")}</span>
                <textarea
                  rows="4"
                  value={reviewForm.reviewText}
                  onChange={(event) =>
                    setReviewForm((current) => ({
                      ...current,
                      reviewText: event.target.value
                    }))
                  }
                  placeholder={ui("Comparte que te parecio este capitulo")}
                  required
                />
              </label>
              <label className={styles.spoilerOption}>
                <input type="checkbox" checked={containsSpoilers} aria-describedby="review-spoiler-help" onChange={event=>setContainsSpoilers(event.target.checked)}/>
                <span><strong>{ui("Esta reseña contiene spoilers")}</strong><small id="review-spoiler-help">{ui("Márcalo si revelas detalles de la trama. Tu reseña quedará oculta hasta que el lector decida verla.")}</small></span>
              </label>
              <button type="submit">{ui("Publicar reseña")}</button>
            </form>
          </section>
        </article>
      </section>

      {selectedIllustration ? (
        <div
          className={styles.lightbox}
          onClick={() => setSelectedIllustration(null)}
          role="presentation"
        >
          <div
            className={styles.lightboxFrame}
            onClick={(event) => event.stopPropagation()}
            role="presentation"
          >
            <button
              className={styles.lightboxClose}
              onClick={() => setSelectedIllustration(null)}
              type="button"
            >{ui(" Cerrar ")}</button>
            <img
              className={styles.lightboxImage}
              src={
                selectedIllustration.public_url || selectedIllustration.publicUrl
              }
              alt={
                selectedIllustration.alt_text ||
                selectedIllustration.altText ||
                activeChapter?.title
              }
            />
          </div>
        </div>
      ) : null}
      </ContentGate>
      </main>
      {reportTarget&&<ReportDialog auth={auth} target={reportTarget} onClose={()=>setReportTarget(null)} onSent={setReportMessage}/>}
    </AppShell>
  );
}
