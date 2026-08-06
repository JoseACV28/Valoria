// Perfil del usuario autenticado o visitado desde una historia.
// Reune identidad, seguimiento y muro de creador conectado a la API.
import { useEffect, useMemo, useState } from "react";
import {
  createCreatorWallComment,
  createCreatorWallPost,
  deleteCreatorWallComment,
  deleteCreatorWallPost,
  fetchCreatorWall,
  fetchProfile,
  followProfile,
  likeCreatorWallComment,
  unfollowProfile,
  updateCreatorWallComment,
  updateCreatorWallPost
} from "../api/profileApi";
import { Navbar } from "../components/layout/Navbar";
import styles from "../styles/ProfilePage.module.css";

const fallbackWallPosts = [];

function buildHandle(value = "") {
  return `@${String(value || "valoria").toLowerCase().replace(/\s+/g, "")}`;
}

function flattenCommentTree(comments) {
  return comments.flatMap((comment) => [comment, ...flattenCommentTree(comment.replies || [])]);
}

function formatWallDate(value) {
  if (!value) {
    return "Ahora";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Ahora";
  }

  return date.toLocaleString("es-CL", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

export function ProfilePage({ auth, onNavigate, profileId }) {
  const viewedProfileId = profileId || auth.user?.id || "";
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState("loading");
  const [activeTab, setActiveTab] = useState("info");
  const [statusDraft, setStatusDraft] = useState("");
  const [wallPosts, setWallPosts] = useState(fallbackWallPosts);
  const [wallStatus, setWallStatus] = useState("loading");
  const [wallMenu, setWallMenu] = useState(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [wallMessage, setWallMessage] = useState("");
  const [commentDrafts, setCommentDrafts] = useState({});
  const [replyTargets, setReplyTargets] = useState({});
  const [editingPostId, setEditingPostId] = useState("");
  const [editingCommentId, setEditingCommentId] = useState("");
  const [editingCommentDraft, setEditingCommentDraft] = useState("");
  const [isSubmittingWallAction, setIsSubmittingWallAction] = useState(false);

  const viewingForeignProfile = Boolean(profileId && profileId !== auth.user?.id);
  const publishedStories = useMemo(
    () => profile?.publishedStories || [],
    [profile]
  );
  const isOwnProfile = !viewingForeignProfile && (profile?.isOwnProfile ?? true);
  const canUseWallApi = Boolean(viewedProfileId && auth.token);
  const fallbackVisitedName =
    wallPosts[0]?.authorName ||
    publishedStories[0]?.author ||
    (viewingForeignProfile ? "Creador" : auth.user?.displayName) ||
    "Valoria";
  const visibleDisplayName = profile?.displayName || fallbackVisitedName;
  const visibleHandle = profile?.handle || buildHandle(visibleDisplayName);
  const visibleWorksCount = profile?.worksCount ?? publishedStories.length;
  const visibleFollowerCount = profile?.followerCount ?? 0;
  const profileInitial = (visibleDisplayName || "V")
    .slice(0, 1)
    .toUpperCase();

  useEffect(() => {
    if (!viewedProfileId) {
      setStatus("error");
      return;
    }

    async function loadProfile() {
      try {
        setStatus("loading");
        const data = await fetchProfile(viewedProfileId, auth.token);
        setProfile(data.profile);
        setStatus("ready");
      } catch {
        setStatus("error");
      }
    }

    loadProfile();
  }, [viewedProfileId, auth.token]);

  useEffect(() => {
    if (!viewedProfileId) {
      setWallStatus("error");
      setWallPosts([]);
      return;
    }

    reloadWall();
  }, [viewedProfileId, auth.token]);

  useEffect(() => {
    function closeMenus() {
      setWallMenu(null);
      setProfileMenuOpen(false);
    }

    window.addEventListener("click", closeMenus);

    return () => {
      window.removeEventListener("click", closeMenus);
    };
  }, []);

  async function reloadProfile() {
    if (!viewedProfileId) {
      return;
    }

    const data = await fetchProfile(viewedProfileId, auth.token);
    setProfile(data.profile);
  }

  async function reloadWall() {
    if (!viewedProfileId) {
      setWallPosts([]);
      setWallStatus("error");
      return;
    }

    try {
      setWallStatus("loading");
      const data = await fetchCreatorWall(viewedProfileId, auth.token);
      setWallPosts(data.posts || []);
      setWallStatus("ready");
    } catch {
      setWallPosts(fallbackWallPosts);
      setWallStatus("fallback");
    }
  }

  function toggleWallMenu(nextMenu) {
    setWallMenu((current) => {
      if (
        current &&
        current.type === nextMenu.type &&
        current.postId === nextMenu.postId &&
        current.commentId === nextMenu.commentId
      ) {
        return null;
      }

      return nextMenu;
    });
  }

  function canDeletePost(post) {
    return Boolean(
      auth.isAuthenticated &&
        (post.isEditableByCurrentUser ||
          post.authorId === auth.user?.id ||
          post.creatorId === auth.user?.id)
    );
  }

  async function handleToggleFollow() {
    if (!auth.isAuthenticated || !viewedProfileId || isOwnProfile) {
      return;
    }

    try {
      if (profile?.isFollowing) {
        await unfollowProfile(viewedProfileId, auth.token);
      } else {
        await followProfile(viewedProfileId, auth.token);
      }

      await reloadProfile();
    } catch (error) {
      setWallMessage(error.message);
    }
  }

  async function handleWallAction(action, target) {
    setWallMenu(null);

    if (!canUseWallApi && (action === "delete-post" || action === "delete-comment")) {
      setWallMessage("Tu sesion no tiene un perfil valido. Cierra sesion e inicia nuevamente.");
      return;
    }

    if (action === "mute") {
      setWallMessage("Notificaciones silenciadas para este hilo.");
      return;
    }

    if (action === "report") {
      setWallMessage("Comentario marcado para revision.");
      return;
    }

    if (action === "block-user") {
      setWallMessage("Usuario bloqueado en esta experiencia local.");
      return;
    }

    if (action === "mute-user") {
      setWallMessage("Usuario silenciado en esta experiencia local.");
      return;
    }

    if (action === "report-user") {
      setWallMessage("Perfil marcado para revision.");
      return;
    }

    if (action === "edit-post") {
      const post = wallPosts.find((item) => item.id === target.postId);
      if (!post) {
        return;
      }

      setEditingPostId(post.id);
      setStatusDraft(post.content);
      setWallMessage("Modo edicion activado para la publicacion.");
      return;
    }

    if (action === "edit-comment") {
      const comment = wallPosts
        .flatMap((post) => flattenCommentTree(post.comments || []))
        .find((item) => item.id === target.commentId);

      if (!comment) {
        return;
      }

      setEditingCommentId(comment.id);
      setEditingCommentDraft(comment.content);
      setWallMessage("Editando comentario.");
      return;
    }

    try {
      setIsSubmittingWallAction(true);

      if (action === "delete-post") {
        await deleteCreatorWallPost(viewedProfileId, target.postId, auth.token);
        await reloadWall();
        setWallMessage("Publicacion eliminada del muro.");
        return;
      }

      if (action === "delete-comment") {
        await deleteCreatorWallComment(viewedProfileId, target.commentId, auth.token);
        await reloadWall();
        setWallMessage("Comentario eliminado del muro.");
      }
    } catch (error) {
      setWallMessage(error.message);
    } finally {
      setIsSubmittingWallAction(false);
    }
  }

  async function handleSubmitStatus() {
    if (!isOwnProfile) {
      setWallMessage("Solo el creador puede publicar en su propio muro.");
      return;
    }

    if (!canUseWallApi) {
      setWallMessage("Tu sesion no tiene un perfil valido. Cierra sesion e inicia nuevamente.");
      return;
    }

    if (!statusDraft.trim()) {
      return;
    }

    try {
      setIsSubmittingWallAction(true);

      if (editingPostId) {
        await updateCreatorWallPost(
          viewedProfileId,
          editingPostId,
          { content: statusDraft.trim() },
          auth.token
        );
        setWallMessage("Publicacion actualizada.");
      } else {
        await createCreatorWallPost(
          viewedProfileId,
          { content: statusDraft.trim() },
          auth.token
        );
        setWallMessage("Estado publicado en el muro.");
      }

      setStatusDraft("");
      setEditingPostId("");
      await reloadWall();
    } catch (error) {
      setWallMessage(error.message);
    } finally {
      setIsSubmittingWallAction(false);
    }
  }

  async function handleSubmitComment(postId) {
    if (!canUseWallApi) {
      setWallMessage("Tu sesion no tiene un perfil valido. Cierra sesion e inicia nuevamente.");
      return;
    }

    const content = commentDrafts[postId]?.trim();

    if (!content) {
      return;
    }

    try {
      setIsSubmittingWallAction(true);

      await createCreatorWallComment(
        viewedProfileId,
        postId,
        {
          content,
          parentCommentId: replyTargets[postId]?.commentId || null
        },
        auth.token
      );

      setCommentDrafts((current) => ({
        ...current,
        [postId]: ""
      }));
      setReplyTargets((current) => ({
        ...current,
        [postId]: null
      }));
      await reloadWall();
      setWallMessage("Comentario publicado en el muro.");
    } catch (error) {
      setWallMessage(error.message);
    } finally {
      setIsSubmittingWallAction(false);
    }
  }

  async function handleSaveCommentEdit(commentId) {
    if (!canUseWallApi) {
      setWallMessage("Tu sesion no tiene un perfil valido. Cierra sesion e inicia nuevamente.");
      return;
    }

    if (!editingCommentDraft.trim()) {
      return;
    }

    try {
      setIsSubmittingWallAction(true);
      await updateCreatorWallComment(
        viewedProfileId,
        commentId,
        { content: editingCommentDraft.trim() },
        auth.token
      );
      setEditingCommentId("");
      setEditingCommentDraft("");
      await reloadWall();
      setWallMessage("Comentario actualizado.");
    } catch (error) {
      setWallMessage(error.message);
    } finally {
      setIsSubmittingWallAction(false);
    }
  }

  async function handleLikeComment(commentId) {
    if (!canUseWallApi) {
      setWallMessage("Tu sesion no tiene un perfil valido. Cierra sesion e inicia nuevamente.");
      return;
    }

    try {
      setIsSubmittingWallAction(true);
      await likeCreatorWallComment(viewedProfileId, commentId, auth.token);
      await reloadWall();
    } catch (error) {
      setWallMessage(error.message);
    } finally {
      setIsSubmittingWallAction(false);
    }
  }

  function renderWallComment(comment, postId, depth = 0) {
    const isEditing = editingCommentId === comment.id;

    return (
      <div
        key={comment.id}
        className={styles.wallReply}
        style={{ marginLeft: depth > 0 ? `${depth * 24}px` : undefined }}
      >
        <div className={styles.replyAvatar}>
          {comment.authorName?.slice(0, 1).toUpperCase() || "L"}
        </div>
        <div className={styles.replyBody}>
          {isEditing ? (
            <div className={styles.inlineEditor}>
              <textarea
                rows="2"
                value={editingCommentDraft}
                onChange={(event) => setEditingCommentDraft(event.target.value)}
              />
              <div className={styles.inlineEditorActions}>
                <button onClick={() => handleSaveCommentEdit(comment.id)} type="button">
                  {isSubmittingWallAction ? "Guardando..." : "Guardar"}
                </button>
                <button
                  className={styles.composerGhost}
                  onClick={() => {
                    setEditingCommentId("");
                    setEditingCommentDraft("");
                  }}
                  type="button"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <>
              <p>
                <strong>{comment.authorName}</strong>{" "}
                <span>{buildHandle(comment.authorName)}</span> {comment.content}
              </p>
              <div className={styles.wallReplyActions}>
                <span>{formatWallDate(comment.createdAt || comment.created_at)}</span>
                <button
                  className={styles.wallActionButton}
                  onClick={() =>
                    setReplyTargets((current) => ({
                      ...current,
                      [postId]: {
                        commentId: comment.id,
                        authorName: comment.authorName
                      }
                    }))
                  }
                  type="button"
                >
                  Responder
                </button>
                <button
                  className={styles.wallActionButton}
                  onClick={() => handleLikeComment(comment.id)}
                  type="button"
                  disabled={comment.likedByCurrentUser}
                >
                  {comment.likedByCurrentUser ? "Te gusta" : "Me gusta"} ·{" "}
                  {comment.likesCount || 0}
                </button>
                {comment.isEditableByCurrentUser ? (
                  <button
                    className={styles.wallActionButton}
                    onClick={() => {
                      setEditingCommentId(comment.id);
                      setEditingCommentDraft(comment.content);
                    }}
                    type="button"
                  >
                    Editar
                  </button>
                ) : null}
              </div>
            </>
          )}
        </div>
        <button
          className={styles.moreButton}
          onClick={(event) => {
            event.stopPropagation();
            toggleWallMenu({
              type: "comment",
              postId,
              commentId: comment.id
            });
          }}
          type="button"
        >
          •••
        </button>

        {wallMenu?.type === "comment" &&
        wallMenu.postId === postId &&
        wallMenu.commentId === comment.id ? (
          <div
            className={styles.wallMenuReply}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={() => handleWallAction("mute", { postId, commentId: comment.id })}
              type="button"
            >
              <span className={styles.menuIcon}>🔇</span>
              <span>Silenciar notificacion</span>
            </button>
            <button
              onClick={() => handleWallAction("report", { postId, commentId: comment.id })}
              type="button"
            >
              <span className={styles.menuIcon}>⚑</span>
              <span>Reportar comentario</span>
            </button>
            {comment.isEditableByCurrentUser ? (
              <button
                onClick={() =>
                  handleWallAction("edit-comment", { postId, commentId: comment.id })
                }
                type="button"
              >
                <span className={styles.menuIcon}>✎</span>
                <span>Editar comentario</span>
              </button>
            ) : null}
            {comment.isDeletableByCurrentUser ? (
              <button
                className={styles.wallMenuDanger}
                onClick={() =>
                  handleWallAction("delete-comment", {
                    postId,
                    commentId: comment.id
                  })
                }
                type="button"
              >
                <span className={styles.menuIcon}>✕</span>
                <span>Eliminar comentario</span>
              </button>
            ) : null}
          </div>
        ) : null}

        {comment.replies?.length
          ? comment.replies.map((reply) => renderWallComment(reply, postId, depth + 1))
          : null}
      </div>
    );
  }

  if (!auth.isAuthenticated && !profileId) {
    return (
      <main className={styles.page}>
        <Navbar auth={auth} currentView="profile" onNavigate={onNavigate} />
        <section className={styles.emptyState}>
          <span>Perfil</span>
          <h1>Inicia sesion para ver tu perfil</h1>
          <p>Tu perfil personal vive aqui, separado del home y del panel de creador.</p>
          <button onClick={() => onNavigate("login")} type="button">
            Iniciar sesion
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <Navbar auth={auth} currentView="profile" onNavigate={onNavigate} />

      <section className={styles.hero}>
        <div className={styles.avatar}>
          <span>{profileInitial}</span>
        </div>
        <h1>{visibleDisplayName}</h1>
        <p className={styles.handle}>{visibleHandle}</p>

        <div className={styles.metrics}>
          <div>
            <strong>{visibleWorksCount}</strong>
            <span>Obras</span>
          </div>
          <div>
            <strong>1</strong>
            <span>Lista de lectura</span>
          </div>
          <div>
            <strong>{visibleFollowerCount}</strong>
            <span>Seguidores</span>
          </div>
        </div>
      </section>

      <section className={styles.tabs}>
        <button
          className={activeTab === "info" ? styles.activeTab : ""}
          onClick={() => setActiveTab("info")}
          type="button"
        >
          Info
        </button>
        <button
          className={activeTab === "wall" ? styles.activeTab : ""}
          onClick={() => setActiveTab("wall")}
          type="button"
        >
          Muro de creador
        </button>
        <button
          className={activeTab === "following" ? styles.activeTab : ""}
          onClick={() => setActiveTab("following")}
          type="button"
        >
          Siguiendo
        </button>
        <div className={styles.headerActions}>
          {isOwnProfile ? (
            <button className={styles.editButton} type="button">
              Edita tu perfil
            </button>
          ) : (
            <>
              <button
                className={`${styles.followButton} ${profile?.isFollowing ? styles.followingButton : ""}`}
                onClick={handleToggleFollow}
                type="button"
              >
                {profile?.isFollowing ? "Siguiendo" : "Seguir"}
              </button>
              <div className={styles.profileMenuWrap}>
                <button
                  className={styles.profileMenuButton}
                  onClick={(event) => {
                    event.stopPropagation();
                    setProfileMenuOpen((current) => !current);
                  }}
                  type="button"
                >
                  •••
                </button>
                {profileMenuOpen ? (
                  <div
                    className={styles.wallMenu}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <button onClick={() => handleWallAction("report-user")} type="button">
                      <span className={styles.menuIcon}>⚑</span>
                      <span>Reportar usuario</span>
                    </button>
                    <button onClick={() => handleWallAction("mute-user")} type="button">
                      <span className={styles.menuIcon}>🔇</span>
                      <span>Silenciar usuario</span>
                    </button>
                    <button onClick={() => handleWallAction("block-user")} type="button">
                      <span className={styles.menuIcon}>⛔</span>
                      <span>Bloquear usuario</span>
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>
      </section>

      {activeTab === "info" ? (
        <section className={styles.contentGrid}>
          <article className={styles.infoCard}>
            <h2>
              {isOwnProfile
                ? "Ayuda a que las personas puedan conocerte"
                : `Sobre ${visibleDisplayName || "este creador"}`}
            </h2>
            {isOwnProfile ? (
              <button className={styles.descriptionButton} type="button">
                Añade una descripcion
              </button>
            ) : null}
            <p>
              {profile
                ? isOwnProfile
                  ? `${profile.displayName} forma parte del universo de Valoria.`
                  : `${profile.displayName} ha publicado ${profile.worksCount} historias y cuenta con ${profile.followerCount} seguidores dentro de Valoria.`
                : isOwnProfile
                  ? "Cargando informacion del perfil."
                  : `${visibleDisplayName} forma parte del universo de Valoria.`}
            </p>

            <div className={styles.shareBlock}>
              <span>Compartir perfil</span>
              <div className={styles.shareRow}>
                <button type="button">f</button>
                <button type="button">x</button>
                <button type="button">p</button>
                <button type="button">t</button>
                <button type="button">@</button>
              </div>
            </div>
          </article>

          <article className={styles.libraryCard}>
            <div className={styles.libraryHeader}>
              <div>
                <span>{isOwnProfile ? "Mi espacio" : "Historias del creador"}</span>
                <h2>
                  {status === "ready"
                    ? isOwnProfile
                      ? `${publishedStories.length} historias en tu universo`
                      : `${publishedStories.length} historias publicadas por ${visibleDisplayName || "este creador"}`
                    : "Cargando historias del perfil"}
                </h2>
              </div>
              {isOwnProfile ? (
                <button
                  className={styles.creatorShortcut}
                  onClick={() => onNavigate("creator")}
                  type="button"
                >
                  Ir al panel de creador
                </button>
              ) : null}
            </div>

            <div className={styles.shelf}>
              {publishedStories.length > 0 ? (
                publishedStories.slice(0, 4).map((story) => (
                  <article key={story.id} className={styles.storyCard}>
                    <img src={story.cover} alt={story.title} />
                    <strong>{story.title}</strong>
                    <small>Publicado</small>
                  </article>
                ))
              ) : (
                <div className={styles.emptyShelf}>
                  <p>Este perfil aun no tiene historias publicadas.</p>
                </div>
              )}
            </div>
          </article>
        </section>
      ) : null}

      {activeTab === "wall" ? (
        <section className={styles.wallLayout}>
          {isOwnProfile ? (
            <article className={styles.wallComposer}>
              <div className={styles.wallAvatar}>{profileInitial}</div>
              <div className={styles.wallComposerBody}>
                <textarea
                  placeholder="Comparte un estado con tus seguidores"
                  rows="2"
                  value={statusDraft}
                  onChange={(event) => setStatusDraft(event.target.value)}
                />
                <div className={styles.wallComposerActions}>
                  <button onClick={handleSubmitStatus} type="button">
                    {isSubmittingWallAction
                      ? "Guardando..."
                      : editingPostId
                        ? "Guardar estado"
                        : "Publicar estado"}
                  </button>
                  {editingPostId ? (
                    <button
                      className={styles.composerGhost}
                      onClick={() => {
                        setEditingPostId("");
                        setStatusDraft("");
                      }}
                      type="button"
                    >
                      Cancelar edicion
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ) : null}

          <div className={styles.wallFeed}>
            {wallMessage ? <p className={styles.wallMessage}>{wallMessage}</p> : null}
            {wallStatus === "loading" ? (
              <p className={styles.wallMessage}>Cargando muro del creador...</p>
            ) : null}

            {wallPosts.map((post) => (
              <article key={post.id} className={styles.wallCard}>
                <div className={styles.wallCardHeader}>
                  <div className={styles.wallAuthor}>
                    <div className={styles.wallAvatarMuted}>
                      {post.authorName?.slice(0, 1).toUpperCase() || "V"}
                    </div>
                    <div>
                      <strong>{post.authorName}</strong>
                      <p>{formatWallDate(post.createdAt || post.created_at)}</p>
                    </div>
                  </div>
                  <button
                    className={styles.moreButton}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleWallMenu({
                        type: "post",
                        postId: post.id
                      });
                    }}
                    type="button"
                  >
                    •••
                  </button>
                </div>

                <div className={styles.wallContent}>
                  {post.content.split("\n").map((paragraph, index) => (
                    <p key={`${post.id}-${index}`}>{paragraph}</p>
                  ))}
                </div>

                <div className={styles.wallPostActions}>
                  <button
                    className={styles.wallActionButton}
                    onClick={() =>
                      setReplyTargets((current) => ({
                        ...current,
                        [post.id]: null
                      }))
                    }
                    type="button"
                  >
                    Responder
                  </button>
                  <span>{(post.comments || []).length} comentarios</span>
                </div>

                <div className={styles.wallReplies}>
                  {(post.comments || []).map((comment) => renderWallComment(comment, post.id))}
                </div>

                <div className={styles.wallReplyComposer}>
                  <div className={styles.wallAvatar}>
                    {(auth.user?.displayName || "L").slice(0, 1).toUpperCase()}
                  </div>
                  <div className={styles.wallComposerBody}>
                    {replyTargets[post.id] ? (
                      <div className={styles.replyTargetPill}>
                        Respondiendo a {replyTargets[post.id].authorName}
                        <button
                          onClick={() =>
                            setReplyTargets((current) => ({
                              ...current,
                              [post.id]: null
                            }))
                          }
                          type="button"
                        >
                          ×
                        </button>
                      </div>
                    ) : null}
                    <textarea
                      placeholder="Escribe una respuesta..."
                      rows="2"
                      value={commentDrafts[post.id] || ""}
                      onChange={(event) =>
                        setCommentDrafts((current) => ({
                          ...current,
                          [post.id]: event.target.value
                        }))
                      }
                    />
                    <div className={styles.wallComposerActions}>
                      <button onClick={() => handleSubmitComment(post.id)} type="button">
                        {isSubmittingWallAction ? "Publicando..." : "Publicar comentario"}
                      </button>
                    </div>
                  </div>
                </div>

                {wallMenu?.type === "post" && wallMenu.postId === post.id ? (
                  <div
                    className={styles.wallMenu}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <button
                      onClick={() => handleWallAction("mute", { postId: post.id })}
                      type="button"
                    >
                      <span className={styles.menuIcon}>🔇</span>
                      <span>Silenciar notificacion</span>
                    </button>
                    <button
                      onClick={() => handleWallAction("report", { postId: post.id })}
                      type="button"
                    >
                      <span className={styles.menuIcon}>⚑</span>
                      <span>Reportar comentario</span>
                    </button>
                    {post.isEditableByCurrentUser ? (
                      <button
                        onClick={() => handleWallAction("edit-post", { postId: post.id })}
                        type="button"
                      >
                        <span className={styles.menuIcon}>✎</span>
                        <span>Editar publicacion</span>
                      </button>
                    ) : null}
                    {canDeletePost(post) ? (
                      <button
                        className={styles.wallMenuDanger}
                        onClick={() => handleWallAction("delete-post", { postId: post.id })}
                        type="button"
                      >
                        <span className={styles.menuIcon}>✕</span>
                        <span>Eliminar comentario</span>
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {activeTab === "following" ? (
        <section className={styles.placeholderSection}>
          <article className={styles.libraryCard}>
            <div className={styles.libraryHeader}>
              <div>
                <span>Siguiendo</span>
                <h2>{profile?.followingCount || 0} perfiles en tu circulo creativo</h2>
              </div>
            </div>
            <p className={styles.placeholderText}>
              Este espacio quedara listo para listar autores seguidos y sus novedades.
            </p>
          </article>
        </section>
      ) : null}
    </main>
  );
}
