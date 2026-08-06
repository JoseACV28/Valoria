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
import { clampRating } from "../utils/ratings";
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
  const persistedStory = isPersistedStory(story);
  const [storyState, setStoryState] = useState(normalizeStoryForReading(story));
  const [chapters, setChapters] = useState(
    persistedStory ? [] : buildFallbackChapters(story)
  );
  const [reviews, setReviews] = useState(
    persistedStory ? [] : buildFallbackReviews(story)
  );
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [status, setStatus] = useState("loading");
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

    async function loadChapters() {
      try {
        const data = await fetchStoryChapters(story.id);

        if (active && data.chapters.length > 0) {
          setChapters(data.chapters);
          setStatus("ready");
          return;
        }

        if (active) {
          setChapters(persistedStory ? [] : buildFallbackChapters(story));
          setStatus(persistedStory ? "ready" : "fallback");
        }
      } catch (error) {
        if (active) {
          setChapters(persistedStory ? [] : buildFallbackChapters(story));
          setStatus(persistedStory ? "ready" : "fallback");
        }
      }
    }

    loadChapters();

    return () => {
      active = false;
    };
  }, [persistedStory, story]);

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
      try {
        const data = await registerStoryRead(story.id);

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
  }, [story]);

  const hasPreviousChapter = activeChapterIndex > 0;
  const hasNextChapter = activeChapterIndex < chapters.length - 1;
  const chapterParagraphs = activeChapter
    ? (activeChapter?.content || "").split("\n").filter(Boolean)
    : [];
  const midpoint = Math.max(1, Math.ceil(chapterParagraphs.length / 2));
  const creatorIllustrations = (activeChapter?.chapter_images || []).filter(
    (image) => (image.image_role || image.imageRole || "creator") === "creator"
  );
  const communityIllustrations = (activeChapter?.chapter_images || []).filter(
    (image) => (image.image_role || image.imageRole) === "community"
  );
  const chapterIllustration =
    creatorIllustrations[0]?.public_url || creatorIllustrations[0]?.publicUrl || "";
  const bookStartsAfterIllustration = Boolean(chapterIllustration);
  const leftPageParagraphs = bookStartsAfterIllustration
    ? []
    : chapterParagraphs.slice(0, midpoint);
  const rightPageParagraphs = bookStartsAfterIllustration
    ? chapterParagraphs.slice(0, midpoint)
    : chapterParagraphs.slice(midpoint);
  const trailingParagraphs = bookStartsAfterIllustration
    ? chapterParagraphs.slice(midpoint)
    : [];
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
      reviewText: reviewForm.reviewText,
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

      const chapterData = await fetchStoryChapters(story.id);
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
        <p>{review.review_text || review.reviewText}</p>
        <div className={styles.reviewActions}>
          <button
            className={styles.reviewActionButton}
            onClick={() => handleReviewLike(review.id)}
            type="button"
            disabled={review.likedByCurrentUser}
          >
            {review.likedByCurrentUser ? "Te gusta" : "Me gusta"} · {review.likesCount || 0}
          </button>
          <button
            className={styles.reviewActionButton}
            onClick={() =>
              setReplyingTo((current) => (current === review.id ? "" : review.id))
            }
            type="button"
          >
            Responder
          </button>
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
              placeholder="Escribe una respuesta dentro de esta reseña"
            />
            <button
              className={styles.replySubmitButton}
              onClick={() => handleReplySubmit(review.id)}
              type="button"
            >
              Enviar respuesta
            </button>
          </div>
        ) : null}
      </article>
    );
  }

  return (
    <AppShell auth={auth} currentView="reading" onNavigate={onNavigate}>
      <main className={styles.page}>
        <Navbar auth={auth} currentView="reading" {...navFilters} onNavigate={onNavigate} />

      <section className={styles.hero}>
        <img src={storyState.cover} alt={storyState.title} />

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
                  alt={storyState.author || "Autor"}
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
              <small>Creador de la historia</small>
            </div>
          </div>

          <div className={styles.storyStatsRow}>
            <div className={styles.storyRating}>
              <StarRating value={averageRating} size="lg" icon="heart" />
            </div>
            <small>{storyState.reads} lecturas</small>
            <small>{reviews.length} reseñas</small>
          </div>

          <div className={styles.storyRatingMobile}>
            <StarRating value={averageRating} size="lg" icon="heart" />
            <span>{reviews.length} reseñas</span>
          </div>
        </div>
      </section>

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
            <strong>Cap {chapter.chapter_number || index + 1}</strong>
          </button>
        ))}
      </section>

      <section className={styles.readerWrap}>
        <article className={styles.reader}>
          <header className={styles.readerHeader}>
            <span>
              Capitulo {activeChapter?.chapter_number || activeChapterIndex + 1}
            </span>
            <h2>{activeChapter?.title}</h2>
            <div className={styles.readingModes}>
              <button
                className={`${styles.modeButton} ${
                  readingMode === "standard" ? styles.modeButtonActive : ""
                }`}
                onClick={() => setReadingMode("standard")}
                type="button"
              >
                Lectura tradicional
              </button>
              <button
                className={`${styles.modeButton} ${
                  readingMode === "book" ? styles.modeButtonActive : ""
                }`}
                onClick={() => setReadingMode("book")}
                type="button"
              >
                Formato libro
              </button>
            </div>
          </header>

          <div
            className={`${styles.readerContent} ${
              readingMode === "book" ? styles.readerContentBook : ""
            }`}
          >
            {activeChapter ? (
              readingMode === "book" ? (
                <div className={styles.bookSpread}>
                  <section className={styles.bookPage}>
                    <div className={styles.bookPageInner}>
                      {bookStartsAfterIllustration ? (
                        <img
                          className={styles.bookIllustration}
                          src={chapterIllustration}
                          alt={activeChapter?.title || storyState.title}
                        />
                      ) : (
                        <>
                          <h3>{activeChapter?.title}</h3>
                          {leftPageParagraphs.map((paragraph, index) => (
                            <p key={`${activeChapter?.id || "chapter"}-left-${index}`}>
                              {paragraph}
                            </p>
                          ))}
                        </>
                      )}
                    </div>
                  </section>

                  <section className={styles.bookPage}>
                    <div className={styles.bookPageInner}>
                      {bookStartsAfterIllustration ? (
                        <h3>{activeChapter?.title}</h3>
                      ) : null}
                      {rightPageParagraphs.map((paragraph, index) => (
                        <p key={`${activeChapter?.id || "chapter"}-right-${index}`}>
                          {paragraph}
                        </p>
                      ))}
                      {trailingParagraphs.length > 0 ? (
                        <div className={styles.bookContinuation}>
                          {trailingParagraphs.map((paragraph, index) => (
                            <p
                              key={`${activeChapter?.id || "chapter"}-trail-${index}`}
                            >
                              {paragraph}
                            </p>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </section>
                </div>
              ) : (
                chapterParagraphs.map((paragraph, index) => (
                  <p key={`${activeChapter?.id || "chapter"}-${index}`}>
                    {paragraph}
                  </p>
                ))
              )
            ) : (
              <p className={styles.emptyText}>
                Esta historia aun no tiene capitulos publicados.
              </p>
            )}
          </div>

          <div className={styles.chapterNav}>
            {hasPreviousChapter ? (
              <button
                className={styles.navButton}
                onClick={() => setActiveChapterIndex((current) => current - 1)}
                type="button"
              >
                Capitulo anterior
              </button>
            ) : (
              <span />
            )}

            {hasNextChapter ? (
              <button
                className={styles.navButton}
                onClick={() => setActiveChapterIndex((current) => current + 1)}
                type="button"
              >
                Siguiente capitulo
              </button>
            ) : null}
          </div>

          <section className={styles.illustrationSection}>
            <div className={styles.illustrationHeader}>
              <span>Ilustracion del creador</span>
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
              <p className={styles.illustrationEmpty}>
                Este capitulo aun no tiene ilustracion del creador.
              </p>
            )}
          </section>

          <section className={styles.illustrationSection}>
            <div className={styles.illustrationHeader}>
              <span>Ilustraciones de la comunidad</span>
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
              <p className={styles.illustrationEmpty}>
                La comunidad aun no ha compartido ilustraciones para este capitulo.
              </p>
            )}

            <form
              className={styles.communityIllustrationForm}
              onSubmit={handleCommunityIllustrationSubmit}
            >
              <label>
                <span>Sube una ilustracion para este capitulo</span>
                <div className={styles.filePicker}>
                  <label className={styles.fileButton}>
                    <input
                      className={styles.fileInput}
                      type="file"
                      accept="image/*"
                      onChange={(event) =>
                        setCommunityImage(event.target.files?.[0] || null)
                      }
                    />
                    Elegir ilustracion
                  </label>
                  <small className={styles.fileName}>
                    {communityImage?.name || "Ningun archivo seleccionado"}
                  </small>
                </div>
              </label>
              <button type="submit">Compartir ilustracion</button>
              {communityMessage ? (
                <p className={styles.communityMessage}>{communityMessage}</p>
              ) : null}
            </form>
          </section>

          <section className={styles.reviewSection}>
            <div className={styles.reviewHeader}>
              <div>
                <span className={styles.reviewEyebrow}>Comunidad lectora</span>
                <h3>Que opinan los lectores</h3>
              </div>
              <div className={styles.storyRating}>
                <StarRating value={averageRating} icon="heart" />
                <span>{reviews.length} reseñas</span>
              </div>
            </div>

            {reviewMessage ? (
              <p className={styles.reviewInlineMessage}>{reviewMessage}</p>
            ) : null}

            <div className={styles.reviewList}>
              {reviews.map((review) => renderReview(review))}
            </div>

            <form className={styles.reviewForm} onSubmit={handleReviewSubmit}>
              <div className={styles.reviewDivider} />
              <label>
                <span>Puntuacion</span>
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
                      {rating} corazones
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Tu reseña al terminar el capitulo</span>
                <textarea
                  rows="4"
                  value={reviewForm.reviewText}
                  onChange={(event) =>
                    setReviewForm((current) => ({
                      ...current,
                      reviewText: event.target.value
                    }))
                  }
                  placeholder="Comparte que te parecio este capitulo"
                  required
                />
              </label>
              <button type="submit">Publicar reseña</button>
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
            >
              Cerrar
            </button>
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
      </main>
    </AppShell>
  );
}
