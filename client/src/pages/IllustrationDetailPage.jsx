import {ContentGate} from '../components/common/ContentWarnings';
import { ui } from "../i18n/runtime.js";
import {WorkDetailsPublic} from '../components/stories/WorkDetails';
import {ShareWork} from '../components/common/ShareWork';
import { ReportDialog } from "../components/common/ReportDialog";
import { useDialogFocus } from "../hooks/useDialogFocus";
import { LibraryControls } from "../components/common/LibraryControls";
// Hoja de detalle para una ilustracion.
import { useEffect, useState } from "react";
import {
  createIllustrationComment,
  createIllustrationFanart,
  fetchIllustrationComments,
  fetchIllustrationFanarts,
  likeIllustration,
  likeIllustrationComment,
  uploadIllustrationImage
} from "../api/illustrationApi";
import { AppShell } from "../components/layout/AppShell";
import { Navbar } from "../components/layout/Navbar";
import styles from "../styles/IllustrationDetailPage.module.css";

export function IllustrationDetailPage({
  auth,
  illustration,
  navFilters,
  onNavigate
}) {
  const commentTargetId = "illustration-comments";
  const fanartTargetId = "illustration-fanarts";
  const [reportTarget,setReportTarget]=useState(null);
  const [reportMessage,setReportMessage]=useState("");
  const [detailState, setDetailState] = useState(illustration);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const lightboxRef=useDialogFocus(isLightboxOpen,()=>setIsLightboxOpen(false));
  const [comments, setComments] = useState([]);
  const [fanarts, setFanarts] = useState([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentMessage, setCommentMessage] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isLikingIllustration, setIsLikingIllustration] = useState(false);
  const [likingCommentId, setLikingCommentId] = useState("");
  const [fanartTitle, setFanartTitle] = useState("");
  const [fanartPreview, setFanartPreview] = useState(null);
  const [fanartMessage, setFanartMessage] = useState("");
  const [isSubmittingFanart, setIsSubmittingFanart] = useState(false);

  useEffect(() => {
    setDetailState(illustration);
  }, [illustration]);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [illustration]);

  useEffect(() => {
    // Cada vez que se abre una ilustracion nueva, la vista vuelve al inicio para priorizar la imagen.
    window.scrollTo(0, 0);
  }, [illustration?.id, illustration?.slug]);

  useEffect(() => {
    let active = true;

    async function loadComments() {
      if (!illustration?.id && !illustration?.slug) {
        return;
      }

      try {
        const identifier = illustration.slug || illustration.id;
        const data = await fetchIllustrationComments(identifier, auth.token);
        if (active) {
          setComments(data.comments || []);
        }
      } catch {
        if (active) {
          setComments([]);
        }
      }
    }

    loadComments();

    return () => {
      active = false;
    };
  }, [auth.token, illustration]);

  useEffect(() => {
    let active = true;

    async function loadFanarts() {
      if (!illustration?.id && !illustration?.slug) {
        return;
      }

      try {
        const identifier = illustration.slug || illustration.id;
        const data = await fetchIllustrationFanarts(identifier, auth.token);
        if (active) {
          setFanarts(data.fanarts || []);
        }
      } catch {
        if (active) {
          setFanarts([]);
        }
      }
    }

    loadFanarts();

    return () => {
      active = false;
    };
  }, [auth.token, illustration]);

  if (!illustration) {
    return (
      <AppShell auth={auth} currentView="illustration-detail" onNavigate={onNavigate}>
        <main className={styles.page}>
          <Navbar
            auth={auth}
            currentView="illustration-detail"
            {...navFilters}
            onNavigate={onNavigate}
          />
          <section className={styles.emptyState}>
            <strong>{ui("Ilustracion no encontrada")}</strong>
            <p>{ui("Prueba volver a la galeria o revisar el enlace.")}</p>
          </section>
        </main>
        {reportTarget&&<ReportDialog auth={auth} target={reportTarget} onClose={()=>setReportTarget(null)} onSent={setReportMessage}/>}
    </AppShell>
    );
  }

  const identifier = detailState?.slug || detailState?.id;
  const galleryImages =
    detailState?.images?.length > 0
      ? detailState.images
      : detailState?.coverUrl
        ? [
            {
              id: `${detailState.id}-cover`,
              publicUrl: detailState.coverUrl,
              altText: detailState.title
            }
          ]
        : [];
  const activeImage =
    galleryImages[activeImageIndex] || galleryImages[0] || null;
  const hasMultipleImages = galleryImages.length > 1;

  useEffect(() => {
    function handleKeyNavigation(event) {
      const target = event.target;
      const isTypingTarget =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;

      if (isTypingTarget) {
        return;
      }

      if (event.key === "ArrowLeft") {
        showPreviousImage();
      }

      if (event.key === "ArrowRight") {
        showNextImage();
      }

      if (event.key === "Escape") {
        setIsLightboxOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyNavigation);

    return () => {
      window.removeEventListener("keydown", handleKeyNavigation);
    };
  }, [hasMultipleImages, galleryImages.length]);

  function showPreviousImage() {
    if (!hasMultipleImages) {
      return;
    }

    setActiveImageIndex((current) =>
      current === 0 ? galleryImages.length - 1 : current - 1
    );
  }

  function showNextImage() {
    if (!hasMultipleImages) {
      return;
    }

    setActiveImageIndex((current) =>
      current === galleryImages.length - 1 ? 0 : current + 1
    );
  }

  function scrollToSection(sectionId) {
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  async function handleIllustrationLike() {
    try {
      if (!auth.isAuthenticated) {
        throw new Error("Debes iniciar sesion para dar me gusta");
      }

      setIsLikingIllustration(true);
      const result = await likeIllustration(identifier, auth.token);
      setDetailState((current) => ({
        ...current,
        likesCount: result.likesCount,
        likedByCurrentUser: result.liked
      }));
      setCommentMessage(
        result.liked
          ? "Te gusto esta ilustracion."
          : "Quitaste tu me gusta de esta ilustracion."
      );
    } catch (error) {
      setCommentMessage(error.message);
    } finally {
      setIsLikingIllustration(false);
    }
  }

  async function handleCommentSubmit(event) {
    event.preventDefault();

    try {
      if (!auth.isAuthenticated) {
        throw new Error("Debes iniciar sesion para comentar esta ilustracion");
      }

      const content = commentDraft.trim();

      if (!content) {
        throw new Error("Escribe un comentario antes de publicarlo");
      }

      setIsSubmittingComment(true);
      const data = await createIllustrationComment(
        identifier,
        { content },
        auth.token
      );

      setComments((current) => [...current, data.comment].filter(Boolean));
      setDetailState((current) => ({
        ...current,
        commentsCount: data.commentsCount ?? (current.commentsCount || 0) + 1
      }));
      setCommentDraft("");
      setCommentMessage("Comentario publicado.");
    } catch (error) {
      setCommentMessage(error.message);
    } finally {
      setIsSubmittingComment(false);
    }
  }

  async function handleCommentLike(commentId) {
    try {
      if (!auth.isAuthenticated) {
        throw new Error("Debes iniciar sesion para reaccionar a un comentario");
      }

      setLikingCommentId(commentId);
      const result = await likeIllustrationComment(identifier, commentId, auth.token);
      setComments((current) =>
        current.map((comment) =>
          comment.id === commentId
            ? {
                ...comment,
                likesCount: result.likesCount,
                likedByCurrentUser: result.liked
              }
            : comment
        )
      );
    } catch (error) {
      setCommentMessage(error.message);
    } finally {
      setLikingCommentId("");
    }
  }

  function handleFanartFile(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setFanartPreview({
      file,
      objectUrl
    });
    setFanartMessage("");
    event.target.value = "";
  }

  async function handleFanartSubmit(event) {
    event.preventDefault();

    try {
      if (!auth.isAuthenticated) {
        throw new Error("Debes iniciar sesion para subir un fanart");
      }

      if (!fanartPreview?.file) {
        throw new Error("Debes elegir una imagen para el fanart");
      }

      setIsSubmittingFanart(true);
      const upload = await uploadIllustrationImage(
        fanartPreview.file,
        fanartTitle.trim() || detailState.title || "Fanart de comunidad",
        auth.token
      );

      const data = await createIllustrationFanart(
        identifier,
        {
          title: fanartTitle.trim() || "Fanart de comunidad",
          publicUrl: upload.file.publicUrl,
          storagePath: upload.file.storagePath || "",
          altText: upload.file.altText || fanartTitle.trim() || detailState.title
        },
        auth.token
      );

      setFanarts((current) => [data.fanart, ...current].filter(Boolean));
      if (fanartPreview?.objectUrl) {
        URL.revokeObjectURL(fanartPreview.objectUrl);
      }
      setFanartPreview(null);
      setFanartTitle("");
      setFanartMessage("Fanart publicado en la galeria de comunidad.");
    } catch (error) {
      setFanartMessage(error.message);
    } finally {
      setIsSubmittingFanart(false);
    }
  }

  return (
    <AppShell auth={auth} currentView="illustration-detail" onNavigate={onNavigate}>
      <main className={styles.page}>
        <Navbar
          auth={auth}
          currentView="illustration-detail"
          {...navFilters}
          onNavigate={onNavigate}
        />
        <ContentGate key={detailState.id} work={detailState} type="illustration" auth={auth} onNavigate={onNavigate}>

        <section className={styles.layout}>
          <div className={styles.mediaColumn}>
            {activeImage ? (
              <>
                <div className={styles.mainImageFrame}>
                  <button
                    className={styles.mainImageButton}
                    onClick={() => setIsLightboxOpen(true)}
                    type="button"
                  >
                    <img
                      src={activeImage.publicUrl}
                      alt={activeImage.altText || detailState.title}
                    />
                  </button>
                  {hasMultipleImages ? (
                    <>
                      <button
                        aria-label={ui("Ver imagen anterior")}
                        className={`${styles.mediaArrow} ${styles.mediaArrowLeft}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          showPreviousImage();
                        }}
                        type="button"
                      >
                        ‹
                      </button>
                      <button
                        aria-label={ui("Ver imagen siguiente")}
                        className={`${styles.mediaArrow} ${styles.mediaArrowRight}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          showNextImage();
                        }}
                        type="button"
                      >
                        ›
                      </button>
                    </>
                  ) : null}
                </div>
                {hasMultipleImages ? (
                  <div className={styles.thumbRail}>
                    {galleryImages.map((image, index) => (
                      <button
                        key={image.id || `${image.publicUrl}-${index}`}
                        className={`${styles.thumbButton} ${
                          index === activeImageIndex ? styles.thumbButtonActive : ""
                        }`}
                        onClick={() => setActiveImageIndex(index)}
                        type="button"
                      >
                        <img
                          alt={image.altText || `${detailState.title} ${index + 1}`}
                          src={image.publicUrl}
                        />
                      </button>
                    ))}
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </section>

        <section className={styles.infoStack}>
          <article className={`${styles.infoCard} ${styles.infoCardUnified}`}>
            <span>{ui("Ilustracion")}</span>
            <h1>{detailState.title}</h1>
            {detailState.collectionName && <p>{ui("Colección: ")}{detailState.collectionName}</p>}
            {detailState.credits && <p>{ui("Créditos: ")}{detailState.credits}</p>}
            <p>{ui("Permisos de uso: ")}{detailState.usageRights || ui("Todos los derechos reservados")}</p>
            <button
              className={styles.authorLink}
              onClick={() =>
                detailState.authorId
                  ? onNavigate("creator-profile", { profileId: detailState.authorId })
                  : null
              }
              type="button"
            >
              {detailState.author}
            </button>
            <p className={styles.description}>
              {detailState.description || ui("Esta pieza aun no tiene descripcion visible.")}
            </p>

            <div className={styles.metaGrid}>
              <div>
                <strong>{detailState.likesCount}</strong>
                <span>{ui("Me gusta")}</span>
              </div>
              <div>
                <strong>{detailState.commentsCount}</strong>
                <span>{ui("Comentarios")}</span>
              </div>
              <div>
                <strong>{detailState.viewsCount}</strong>
                <span>{ui("Vistas")}</span>
              </div>
            </div>

            <div className={styles.publicationTools}>
            <LibraryControls auth={auth} work={detailState} type="illustration" onNavigate={onNavigate} />
            <button className={styles.reportButton} type="button" onClick={()=>auth.token?setReportTarget({targetType:'illustration',targetId:illustration.id}):onNavigate('login')}>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 21V4m0 0c5-4 9 4 14 0v10c-5 4-9-4-14 0" strokeLinecap="round" strokeLinejoin="round"/></svg>
              {ui("Denunciar publicación")}
            </button>
            </div>
            {reportMessage && <p className={styles.reportMessage} role="status">{ui(reportMessage)}</p>}
            <div className={styles.actionBar}>
              <button
                aria-label={
                  detailState.likedByCurrentUser
                    ? ui("Quitar me gusta de la ilustracion")
                    : ui("Dar me gusta a la ilustracion")
                }
                className={`${styles.actionIconButton} ${
                  detailState.likedByCurrentUser ? styles.actionIconButtonActive : ""
                }`}
                disabled={isLikingIllustration}
                onClick={handleIllustrationLike}
                title={
                  detailState.likedByCurrentUser
                    ? ui("Quitar me gusta")
                    : ui("Dar me gusta")
                }
                type="button"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <path d="M12 20.2 4.9 13.7a4.6 4.6 0 0 1 6.4-6.7L12 7.8l.7-.8a4.6 4.6 0 0 1 6.4 6.7Z" />
                </svg>
              </button>

              <button
                aria-label={ui("Ir a los comentarios")}
                className={styles.actionIconButton}
                onClick={() => scrollToSection(commentTargetId)}
                title={ui("Comentarios")}
                type="button"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <path d="M6 18.5a2 2 0 0 1-2-2V7.5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H10l-4 3z" />
                </svg>
              </button>

              <button
                aria-label={ui("Ir a fanarts de comunidad")}
                className={styles.actionIconButton}
                onClick={() => scrollToSection(fanartTargetId)}
                title={ui("Fanarts")}
                type="button"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <path d="M8 5.5A3.5 3.5 0 1 0 8 12.5a1.5 1.5 0 0 1 0 3 2 2 0 0 0 0 4h4.5A7.5 7.5 0 1 0 8 5.5Zm9.8 6.2h-2.3V9.4a.9.9 0 1 0-1.8 0v2.3h-2.3a.9.9 0 1 0 0 1.8h2.3v2.3a.9.9 0 1 0 1.8 0v-2.3h2.3a.9.9 0 1 0 0-1.8Z" />
                </svg>
              </button>
            </div>

            <div className={styles.tagBlock}>
              {(detailState.categories || []).map((category) => (
                <span key={`${detailState.id}-${category}`}>{ui(category)}</span>
              ))}
              {(detailState.tags || []).map((tag) => (
                <span key={`${detailState.id}-tag-${tag}`}>#{tag}</span>
              ))}
            </div>

            <div className={styles.actionsRow}>
              <button
                className={styles.backButton}
                onClick={() => onNavigate("illustrations")}
                type="button"
              >{ui(" Volver a ilustraciones ")}</button>
            </div>
          </article>
        </section>

        <section className={styles.communityGallerySection} id={fanartTargetId}>
          <div className={styles.communityGalleryHeader}>
            <div>
              <span>{ui("Fanarts de comunidad")}</span>
              <h2>{ui("Ilustraciones inspiradas por esta obra")}</h2>
            </div>
          </div>

          {fanarts.length > 0 ? (
            <div className={styles.communityGalleryGrid}>
              {fanarts.map((fanart) => (
                <article key={fanart.id} className={styles.communityFanartCard}>
                  <img alt={fanart.altText || fanart.title} src={fanart.publicUrl} />
                  <div className={styles.communityFanartMeta}>
                    <strong>{fanart.title}</strong>
                    <button
                      className={styles.communityContributorLink}
                      onClick={() =>
                        fanart.contributorId
                          ? onNavigate("creator-profile", {
                              profileId: fanart.contributorId
                            })
                          : null
                      }
                      type="button"
                    >
                      {fanart.contributorName}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <article className={styles.emptyComments}>
              <strong>{ui("Aun no hay fanarts de comunidad.")}</strong>
              <p>{ui("Se la primera persona en aportar una pieza inspirada por esta ilustracion.")}</p>
            </article>
          )}

          {auth.isAuthenticated ? (
            <form className={styles.fanartForm} onSubmit={handleFanartSubmit}>
              <div className={styles.fanartFormHeader}>
                <div>
                  <strong>{ui("Comparte tu fanart")}</strong>
                  <p>{ui("Sube una pieza visual inspirada en esta ilustracion del creador.")}</p>
                </div>
              </div>
              <div className={styles.fanartFormGrid}>
                <div className={styles.fanartUploadPane}>
                  {fanartPreview?.objectUrl ? (
                    <img
                      alt={fanartTitle || ui("Vista previa del fanart")}
                      className={styles.fanartPreview}
                      src={fanartPreview.objectUrl}
                    />
                  ) : (
                    <div className={styles.fanartPlaceholder}>
                      <strong>{ui("Tu fanart aparecera aqui")}</strong>
                      <span>{ui("Elige una imagen vertical, cuadrada o horizontal.")}</span>
                    </div>
                  )}
                  <label className={styles.fanartFileButton}>
                    <input
                      accept=".png,.gif,.jpg,.jpeg,.webp,image/png,image/gif,image/jpeg,image/webp"
                      className={styles.fanartFileInput}
                      onChange={handleFanartFile}
                      type="file"
                    />{ui(" Elegir imagen ")}</label>
                </div>

                <div className={styles.fanartFields}>
                  <label className={styles.fanartField}>
                    <span>{ui("Titulo del fanart")}</span>
                    <input
                      onChange={(event) => setFanartTitle(event.target.value)}
                      placeholder={ui("Nombre de tu aporte visual")}
                      value={fanartTitle}
                    />
                  </label>

                  <button disabled={isSubmittingFanart} type="submit">
                    {isSubmittingFanart ? ui("Publicando...") : ui("Publicar fanart")}
                  </button>

                  {fanartMessage ? (
                    <p className={styles.fanartMessage}>{fanartMessage}</p>
                  ) : null}
                </div>
              </div>
            </form>
          ) : (
            <div className={styles.loginHint}>
              <strong>{ui("Debes iniciar sesion para subir fanarts de comunidad.")}</strong>
              <button onClick={() => onNavigate("login")} type="button">{ui(" Iniciar sesion ")}</button>
            </div>
          )}
        </section>

        <section className={styles.commentsSection} id={commentTargetId}>
          <div className={styles.commentsHeader}>
            <div>
              <span>{ui("Comunidad visual")}</span>
              <WorkDetailsPublic key={detailState.id} work={detailState} type="illustration" auth={auth} onNavigate={onNavigate}/>
              <ShareWork work={detailState} type="illustration"/>
              <h2>{ui("Comentarios sobre esta ilustracion")}</h2>
            </div>
          </div>

          {commentMessage ? (
            <p className={styles.commentMessage}>{commentMessage}</p>
          ) : null}

          <div className={styles.commentList}>
            {comments.length > 0 ? (
              comments.map((comment) => (
                <article key={comment.id} className={styles.commentCard}>
                  <div className={styles.commentTop}>
                    <div className={styles.commentAuthor}>
                      <span className={styles.commentAvatar}>
                        {comment.authorAvatarUrl ? (
                        <img alt={comment.authorName} src={comment.authorAvatarUrl} />
                      ) : (
                          comment.authorName?.slice(0, 1).toUpperCase() || ui("V")
                        )}
                      </span>
                      <div>
                        <button
                          className={styles.commentAuthorLink}
                          onClick={() =>
                            comment.authorId
                              ? onNavigate("creator-profile", { profileId: comment.authorId })
                              : null
                          }
                          type="button"
                        >
                          {comment.authorName}
                        </button>
                      </div>
                    </div>
                    <small>{new Date(comment.createdAt).toLocaleDateString("es-CL")}</small>
                  </div>
                  <p>{comment.content}</p>
                  <button
                    className={styles.commentLikeButton}
                    disabled={likingCommentId === comment.id}
                    onClick={() => handleCommentLike(comment.id)}
                    type="button"
                  >
                    {comment.likedByCurrentUser ? ui("Te gusta") : ui("Me gusta")} ·{" "}
                    {comment.likesCount || 0}
                  </button>
                </article>
              ))
            ) : (
              <article className={styles.emptyComments}>
                <strong>{ui("Aun no hay comentarios.")}</strong>
                <p>{ui("Se la primera persona en reaccionar a esta ilustracion.")}</p>
              </article>
            )}
          </div>

          {auth.isAuthenticated ? (
            <form className={styles.commentForm} onSubmit={handleCommentSubmit}>
              <label>
                <span>{ui("Deja tu comentario")}</span>
                <textarea
                  onChange={(event) => setCommentDraft(event.target.value)}
                  placeholder={ui("Comparte tu impresion sobre esta ilustracion")}
                  rows="4"
                  value={commentDraft}
                />
              </label>
              <button disabled={isSubmittingComment} type="submit">
                {isSubmittingComment ? ui("Publicando...") : ui("Publicar comentario")}
              </button>
            </form>
          ) : (
            <div className={styles.loginHint}>
              <strong>{ui("Debes iniciar sesion para comentar o dar me gusta.")}</strong>
              <button onClick={() => onNavigate("login")} type="button">{ui(" Iniciar sesion ")}</button>
            </div>
          )}
        </section>

        {isLightboxOpen ? (
          <div
            ref={lightboxRef} role="dialog" aria-modal="true" aria-label={ui("Vista ampliada de la ilustración")}
            className={styles.lightbox}
            onClick={() => setIsLightboxOpen(false)}

          >
            <div
              className={styles.lightboxFrame}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                className={styles.lightboxClose}
                onClick={() => setIsLightboxOpen(false)}
                type="button"
              >{ui(" Cerrar ")}</button>
              {hasMultipleImages ? (
                <>
                  <button
                    aria-label={ui("Ver imagen anterior")}
                    className={`${styles.lightboxArrow} ${styles.lightboxArrowLeft}`}
                    onClick={showPreviousImage}
                    type="button"
                  >
                    ‹
                  </button>
                  <button
                    aria-label={ui("Ver imagen siguiente")}
                    className={`${styles.lightboxArrow} ${styles.lightboxArrowRight}`}
                    onClick={showNextImage}
                    type="button"
                  >
                    ›
                  </button>
                </>
              ) : null}
              <img
                className={styles.lightboxImage}
                src={activeImage?.publicUrl}
                alt={activeImage?.altText || detailState.title}
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
