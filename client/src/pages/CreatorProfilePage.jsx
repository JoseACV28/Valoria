import { ui } from "../i18n/runtime.js";
import { saveWorkspace } from "../api/workspaceApi";
import { ReportDialog } from "../components/common/ReportDialog";
// Vista publica de un creador visitado desde lectura.
// Muestra informacion del autor, seguimiento y su muro.
import { useEffect, useMemo, useState } from "react";
import {
  createCreatorWallComment,
  deleteCreatorWallComment,
  deleteCreatorWallPost,
  fetchCreatorWall,
  fetchFollowingProfiles,
  fetchProfile,
  followProfile,
  likeCreatorWallComment,
  unfollowProfile,
  updateCreatorWallComment
} from "../api/profileApi";
import { fetchIllustrations } from "../api/illustrationApi";
import facebookIcon from "../assets/facebook-icon.svg";
import instagramIcon from "../assets/instagram-icon.svg";
import mailIcon from "../assets/mail-icon.svg";
import pinterestIcon from "../assets/pinterest-icon.svg";
import tiktokIcon from "../assets/tiktok-icon.svg";
import xIcon from "../assets/x-icon.svg";
import { fetchStories } from "../api/storyApi";
import { HomeShelf } from "../components/stories/HomeShelf";
import { AppShell } from "../components/layout/AppShell";
import { Navbar } from "../components/layout/Navbar";
import styles from "../styles/ProfilePage.module.css";

const FOLLOW_EVENT = "valoria-follow-updated";
const FOLLOW_STORAGE_KEY = "valoria-following-cache";

function buildProfileShareLinks({ title, url }) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  return {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    x: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    pinterest: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedTitle}`,
    instagram: "https://www.instagram.com/",
    mail: `mailto:?subject=${encodedTitle}&body=${encodeURIComponent(`Mira este perfil en Valoria: ${url}`)}`,
    tiktok: "https://www.tiktok.com/"
  };
}

function readFollowCache() {
  try {
    const raw = window.localStorage.getItem(FOLLOW_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeFollowCache(cache) {
  window.localStorage.setItem(FOLLOW_STORAGE_KEY, JSON.stringify(cache));
}

function syncFollowCache(userId, creator, following) {
  if (!userId || !creator?.id) {
    return;
  }

  const cache = readFollowCache();
  const currentList = Array.isArray(cache[userId]) ? cache[userId] : [];

  if (following) {
    const nextList = [
      creator,
      ...currentList.filter((item) => item.id !== creator.id)
    ];
    cache[userId] = nextList;
  } else {
    cache[userId] = currentList.filter((item) => item.id !== creator.id);
  }

  writeFollowCache(cache);
}

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

export function CreatorProfilePage({ auth, navFilters, onNavigate, profileId }) {
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState("loading");
  const [activeTab, setActiveTab] = useState("info");
  const [wallPosts, setWallPosts] = useState([]);
  const [wallStatus, setWallStatus] = useState("loading");
  const [wallMenu, setWallMenu] = useState(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [wallMessage, setWallMessage] = useState("");
  const [fallbackStories, setFallbackStories] = useState([]);
  const [illustrations, setIllustrations] = useState([]);
  const [illustrationStatus, setIllustrationStatus] = useState("loading");
  const [followingProfiles, setFollowingProfiles] = useState([]);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [replyTargets, setReplyTargets] = useState({});
  const [editingCommentId, setEditingCommentId] = useState("");
  const [editingCommentDraft, setEditingCommentDraft] = useState("");
  const [submittingCommentPostId, setSubmittingCommentPostId] = useState("");
  const [likingCommentId, setLikingCommentId] = useState("");
  const [savingCommentId, setSavingCommentId] = useState("");
  const [isTogglingFollow, setIsTogglingFollow] = useState(false);

  const publishedStories = useMemo(
    () => profile?.publishedStories || [],
    [profile]
  );
  const visibleDisplayName =
    profile?.displayName || wallPosts[0]?.authorName || "Creador de Valoria";
  const visibleRealName = profile?.realName || "";
  const visibleHandle = profile?.handle || buildHandle(visibleDisplayName);
  const visibleStories = publishedStories.length > 0 ? publishedStories : fallbackStories;
  const visibleIllustrations = useMemo(
    () =>
      illustrations.filter(
        (illustration) =>
          illustration.authorId === profileId && illustration.status === "published"
      ),
    [illustrations, profileId]
  );
  const visibleWorksCount = profile?.worksCount ?? visibleStories.length;
  const visibleFollowerCount = profile?.followerCount ?? 0;
  const visibleAvatarUrl = profile?.avatarUrl || "";
  const visibleCoverUrl = profile?.coverUrl || "";
  const profileInitial = visibleDisplayName.slice(0, 1).toUpperCase();
  const canUseWallApi = Boolean(profileId && auth.token);
  const creatorPreview = useMemo(
    () => ({
      id: profileId,
      displayName: visibleDisplayName,
      handle: visibleHandle,
      worksCount: visibleWorksCount,
      followerCount: visibleFollowerCount,
      cover: visibleCoverUrl || visibleStories[0]?.cover || "",
      coverUrl: visibleCoverUrl || visibleStories[0]?.cover || "",
      avatarUrl: visibleAvatarUrl || ""
    }),
    [
      profileId,
      visibleDisplayName,
      visibleHandle,
      visibleWorksCount,
      visibleFollowerCount,
      visibleStories,
      visibleCoverUrl,
      visibleAvatarUrl
    ]
  );
  const shareLinks = useMemo(
    () =>
      buildProfileShareLinks({
        title: `Descubre el perfil de ${visibleDisplayName} en Valoria`,
        url: `${window.location.origin}/#/creator-profile/${profileId}`
      }),
    [profileId, visibleDisplayName]
  );

  useEffect(() => {
    if (auth.isAuthenticated && profileId && auth.user?.id === profileId) {
      onNavigate("profile");
    }
  }, [auth.isAuthenticated, auth.user?.id, onNavigate, profileId]);

  useEffect(() => {
    if (!profileId) {
      return;
    }

    async function loadProfile() {
      try {
        setStatus("loading");
        const data = await fetchProfile(profileId, auth.token);
        setProfile(data.profile);
        setStatus("ready");
      } catch {
        setStatus("error");
      }
    }

    loadProfile();
  }, [profileId, auth.token]);

  useEffect(() => {
    if (!profileId) {
      return;
    }

    async function loadIllustrations() {
      try {
        setIllustrationStatus("loading");
        const data = await fetchIllustrations();
        setIllustrations(data.illustrations || []);
        setIllustrationStatus("ready");
      } catch {
        setIllustrations([]);
        setIllustrationStatus("error");
      }
    }

    loadIllustrations();
  }, [profileId]);

  useEffect(() => {
    if (!profileId) {
      return;
    }

    async function loadWall() {
      try {
        setWallStatus("loading");
        const data = await fetchCreatorWall(profileId, auth.token);
        setWallPosts(data.posts || []);
        setWallStatus("ready");
      } catch {
        setWallPosts([]);
        setWallStatus("error");
      }
    }

    loadWall();
  }, [profileId, auth.token]);

  useEffect(() => {
    if (!profileId) {
      return;
    }

    reloadFollowingProfiles();
  }, [profileId, auth.token]);

  useEffect(() => {
    async function loadFallbackStories() {
      if (publishedStories.length > 0) {
        setFallbackStories([]);
        return;
      }

      const authorKey = String(visibleDisplayName).trim().toLowerCase();

      if (!authorKey || authorKey === "creador de valoria") {
        return;
      }

      try {
        const data = await fetchStories();
        const matches = (data.stories || []).filter(
          (story) =>
            String(story.author || story.author_name || "")
              .trim()
              .toLowerCase() === authorKey &&
            story.status === "published"
        );
        setFallbackStories(matches);
      } catch {}
    }

    loadFallbackStories();
  }, [publishedStories, visibleDisplayName]);

  useEffect(() => {
    function closeMenus() {
      setWallMenu(null);
      setProfileMenuOpen(false);
    }

    window.addEventListener("click", closeMenus);
    return () => window.removeEventListener("click", closeMenus);
  }, []);

  useEffect(() => {
    if (!wallMessage) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setWallMessage("");
    }, 3200);

    return () => window.clearTimeout(timeoutId);
  }, [wallMessage]);

  async function reloadProfile() {
    const data = await fetchProfile(profileId, auth.token);
    setProfile(data.profile);
  }

  async function reloadWall() {
    const data = await fetchCreatorWall(profileId, auth.token);
    setWallPosts(data.posts || []);
  }

  async function reloadFollowingProfiles() {
    try {
      const data = await fetchFollowingProfiles(profileId, auth.token);
      setFollowingProfiles(data.profiles || []);
    } catch {
      setFollowingProfiles([]);
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

  async function handleToggleFollow() {
    if (!auth.isAuthenticated || !profileId) {
      setWallMessage("Debes iniciar sesion para realizar esta accion.");
      return;
    }

    try {
      setIsTogglingFollow(true);
      setWallMessage("");
      setProfile((current) =>
        current
          ? {
              ...current,
              isFollowing: !current.isFollowing,
              followerCount: Math.max(
                0,
                Number(current.followerCount || 0) + (current.isFollowing ? -1 : 1)
              )
            }
          : current
      );
      if (profile?.isFollowing) {
        await unfollowProfile(profileId, auth.token);
      } else {
        await followProfile(profileId, auth.token);
      }
      syncFollowCache(auth.user?.id, creatorPreview, !profile?.isFollowing);
      await reloadProfile();
      await reloadFollowingProfiles();
      window.dispatchEvent(
        new CustomEvent(FOLLOW_EVENT, {
          detail: {
            profileId,
            following: !profile?.isFollowing,
            creator: creatorPreview
          }
        })
      );
      setWallMessage(
        profile?.isFollowing
          ? `Has dejado de seguir a ${visibleDisplayName}.`
          : `Ahora sigues a ${visibleDisplayName}.`
      );
    } catch (error) {
      setWallMessage(error.message);
      await reloadProfile();
      await reloadFollowingProfiles();
    } finally {
      setIsTogglingFollow(false);
    }
  }

  const [reportTarget,setReportTarget] = useState(null);

  async function handleWallAction(action, target) {
    setWallMenu(null);

    if (action === "report-user") {
      setReportTarget({targetType:"profile",targetId:profileId});
      return;
    }

    if (action === "mute-user") {
      try{await saveWorkspace('preferences',`mute-user:${profileId}`,{enabled:true,name:profile?.displayName||'Creador'},auth.token);setWallMessage('No recibirás nuevas notificaciones de esta cuenta. Puedes cambiarlo en tu biblioteca.');}catch(error){setWallMessage(error.message);}
      return;
    }

    if (action === "block-user") {
      try {await saveWorkspace("blocks",profileId,{blocked:true,name:profile?.displayName||"Cuenta bloqueada"},auth.token);setWallMessage("Cuenta bloqueada. Puedes gestionar el bloqueo en tu biblioteca.");}catch(error){setWallMessage(error.message);}
      return;
    }

    if (action === "mute") {
      try{await saveWorkspace('preferences',`mute-thread:${target.postId}`,{enabled:true},auth.token);setWallMessage('No recibirás nuevas notificaciones de este hilo. Puedes cambiarlo en tu biblioteca.');}catch(error){setWallMessage(error.message);}
      return;
    }

    if (action === "report") {
      setReportTarget({targetType:"comment",targetId:target.commentId||target.postId});
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
      return;
    }

    try {
      if (action === "delete-post") {
        await deleteCreatorWallPost(profileId, target.postId, auth.token);
        await reloadWall();
        return;
      }

      if (action === "delete-comment") {
        await deleteCreatorWallComment(profileId, target.commentId, auth.token);
        await reloadWall();
      }
    } catch (error) {
      setWallMessage(error.message);
    }
  }

  async function handleSubmitComment(postId) {
    const content = commentDrafts[postId]?.trim();

    if (!canUseWallApi || !content) {
      return;
    }

    try {
      setSubmittingCommentPostId(postId);
      await createCreatorWallComment(
        profileId,
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
    } catch (error) {
      setWallMessage(error.message);
    } finally {
      setSubmittingCommentPostId("");
    }
  }

  async function handleSaveCommentEdit(commentId) {
    if (!canUseWallApi || !editingCommentDraft.trim()) {
      return;
    }

    try {
      setSavingCommentId(commentId);
      await updateCreatorWallComment(
        profileId,
        commentId,
        { content: editingCommentDraft.trim() },
        auth.token
      );
      setEditingCommentId("");
      setEditingCommentDraft("");
      await reloadWall();
    } catch (error) {
      setWallMessage(error.message);
    } finally {
      setSavingCommentId("");
    }
  }

  async function handleLikeComment(commentId) {
    if (!canUseWallApi) {
      setWallMessage("Debes iniciar sesion para realizar esta accion.");
      return;
    }

    try {
      setLikingCommentId(commentId);
      await likeCreatorWallComment(profileId, commentId, auth.token);
      await reloadWall();
    } catch (error) {
      setWallMessage(error.message);
    } finally {
      setLikingCommentId("");
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
        <div className={styles.wallReplyRow}>
          <div className={styles.replyAvatar}>
            {comment.authorAvatarUrl ? (
              <img
                alt={comment.authorName || ui("Autor")}
                className={styles.wallAvatarImage}
                src={comment.authorAvatarUrl}
              />
            ) : (
              comment.authorName?.slice(0, 1).toUpperCase() || ui("L")
            )}
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
                    {savingCommentId === comment.id ? ui("Guardando...") : ui("Guardar")}
                  </button>
                  <button
                    className={styles.composerGhost}
                    onClick={() => {
                      setEditingCommentId("");
                      setEditingCommentDraft("");
                    }}
                    type="button"
                  >{ui(" Cancelar ")}</button>
                </div>
              </div>
            ) : (
              <>
                <p>
                  <strong>{comment.authorName}</strong> {comment.content}
                </p>
                <div className={styles.wallReplyActions}>
                  <span>{formatWallDate(comment.createdAt || comment.created_at)}</span>
                  <button
                    className={styles.wallActionButton}
                    onClick={() => {
                      if (!auth.isAuthenticated) {
                        setWallMessage("Debes iniciar sesion para realizar esta accion.");
                        return;
                      }

                      setReplyTargets((current) => ({
                        ...current,
                        [postId]: {
                          commentId: comment.id,
                          authorName: comment.authorName
                        }
                      }));
                    }}
                    type="button"
                  >{ui(" Responder ")}</button>
                  <button
                    className={styles.wallActionButton}
                    onClick={() => handleLikeComment(comment.id)}
                    disabled={likingCommentId === comment.id}
                    type="button"
                  >
                    {(likingCommentId === comment.id
                      ? ui("Actualizando")
                      : comment.likedByCurrentUser
                        ? ui("Te gusta")
                        : ui("Me gusta"))}{" "}
                    · {comment.likesCount || 0}
                  </button>
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
        </div>

        {wallMenu?.type === "comment" &&
        wallMenu.postId === postId &&
        wallMenu.commentId === comment.id ? (
          <div className={styles.wallMenuReply} onClick={(event) => event.stopPropagation()}>
            <button onClick={() => handleWallAction("mute", { postId, commentId: comment.id })} type="button">
              <span className={styles.menuIcon}>🔇</span>
              <span>{ui("Silenciar notificacion")}</span>
            </button>
            <button onClick={() => handleWallAction("report", { postId, commentId: comment.id })} type="button">
              <span className={styles.menuIcon}>⚑</span>
              <span>{ui("Reportar comentario")}</span>
            </button>
            {comment.isEditableByCurrentUser ? (
              <button onClick={() => handleWallAction("edit-comment", { postId, commentId: comment.id })} type="button">
                <span className={styles.menuIcon}>✎</span>
                <span>{ui("Editar comentario")}</span>
              </button>
            ) : null}
            {comment.isDeletableByCurrentUser ? (
              <button className={styles.wallMenuDanger} onClick={() => handleWallAction("delete-comment", { postId, commentId: comment.id })} type="button">
                <span className={styles.menuIcon}>✕</span>
                <span>{ui("Eliminar comentario")}</span>
              </button>
            ) : null}
          </div>
        ) : null}

        {comment.replies?.length ? (
          <div className={styles.wallReplyChildren}>
            {comment.replies.map((reply) => renderWallComment(reply, postId, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <AppShell auth={auth} currentView="creator-profile" onNavigate={onNavigate}>
      <main className={styles.page}>
        <Navbar auth={auth} currentView="creator-profile" {...navFilters} onNavigate={onNavigate} />

      <section
        className={styles.hero}
        style={
          visibleCoverUrl
            ? {
                backgroundImage: `linear-gradient(180deg, rgba(24, 26, 32, 0.18), rgba(24, 26, 32, 0.82)), url("${visibleCoverUrl}")`
              }
            : undefined
        }
      >
        <div className={styles.heroIdentityCard}>
          <div className={styles.avatar}>
            {visibleAvatarUrl ? (
              <img alt={visibleDisplayName} className={styles.avatarImage} src={visibleAvatarUrl} />
            ) : (
              <span>{profileInitial}</span>
            )}
          </div>
          <h1>{visibleDisplayName}</h1>
          {visibleRealName ? <p className={styles.realName}>{visibleRealName}</p> : null}
          <p className={styles.handle}>{visibleHandle}</p>

          <div className={styles.metrics}>
            <div>
              <strong>{visibleWorksCount}</strong>
              <span>{ui("Obras")}</span>
            </div>
            <div>
              <strong>{followingProfiles.length}</strong>
              <span>{ui("Siguiendo")}</span>
            </div>
            <div>
              <strong>{visibleFollowerCount}</strong>
              <span>{ui("Seguidores")}</span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.tabs}>
        <button className={activeTab === "info" ? styles.activeTab : ""} onClick={() => setActiveTab("info")} type="button">{ui(" Info ")}</button>
        <button
          className={activeTab === "stories" ? styles.activeTab : ""}
          onClick={() => setActiveTab("stories")}
          type="button"
        >{ui(" Historias ")}</button>
        <button
          className={activeTab === "illustrations" ? styles.activeTab : ""}
          onClick={() => setActiveTab("illustrations")}
          type="button"
        >{ui(" Ilustraciones ")}</button>
        <button className={activeTab === "wall" ? styles.activeTab : ""} onClick={() => setActiveTab("wall")} type="button">{ui(" Muro de creador ")}</button>
        <button className={activeTab === "following" ? styles.activeTab : ""} onClick={() => setActiveTab("following")} type="button">{ui(" Siguiendo ")}</button>
        <div className={styles.headerActions}>
          <button
            className={`${styles.followButton} ${profile?.isFollowing ? styles.followingButton : ""}`}
            onClick={handleToggleFollow}
            type="button"
            disabled={isTogglingFollow}
          >
            {isTogglingFollow
              ? ui("Actualizando...")
              : profile?.isFollowing
                ? ui("Siguiendo")
                : ui("Seguir")}
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
              <div className={styles.wallMenu} onClick={(event) => event.stopPropagation()}>
                <button onClick={() => handleWallAction("report-user")} type="button">
                  <span className={styles.menuIcon}>⚑</span>
                  <span>{ui("Reportar usuario")}</span>
                </button>
                <button onClick={() => handleWallAction("mute-user")} type="button">
                  <span className={styles.menuIcon}>🔇</span>
                  <span>{ui("Silenciar usuario")}</span>
                </button>
                <button onClick={() => handleWallAction("block-user")} type="button">
                  <span className={styles.menuIcon}>⛔</span>
                  <span>{ui("Bloquear usuario")}</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {wallMessage ? <p className={styles.wallMessage}>{ui(wallMessage)}</p> : null}

      {activeTab === "info" ? (
        <section className={styles.placeholderSection}>
          <article className={`${styles.infoCard} ${styles.infoCardFullWidth}`}>
            <h2>{ui("Sobre ")}{visibleDisplayName}</h2>
            {visibleRealName ? (
              <p className={styles.realNameInfo}>{ui("Nombre real: ")}{visibleRealName}</p>
            ) : null}
            <p>
              {visibleDisplayName}{ui(" ha publicado ")}{visibleWorksCount}{ui(" historias y cuenta con")}{" "}
              {visibleFollowerCount}{ui(" seguidores dentro de Valoria. ")}</p>

            <div className={styles.shareBlock}>
              <span>{ui("Compartir perfil")}</span>
              <div className={styles.shareRow}>
                  <button
                    aria-label={ui("Compartir en Facebook")}
                    onClick={() => window.open(shareLinks.facebook, "_blank", "noopener,noreferrer")}
                    type="button"
                  >
                    <img alt="" src={facebookIcon} />
                  </button>
                  <button
                    aria-label={ui("Compartir en X")}
                    onClick={() => window.open(shareLinks.x, "_blank", "noopener,noreferrer")}
                    type="button"
                  >
                    <img alt="" src={xIcon} />
                  </button>
                  <button
                    aria-label={ui("Compartir en Pinterest")}
                    onClick={() => window.open(shareLinks.pinterest, "_blank", "noopener,noreferrer")}
                    type="button"
                  >
                    <img alt="" src={pinterestIcon} />
                  </button>
                  <button
                    aria-label={ui("Abrir Instagram")}
                    onClick={() => window.open(shareLinks.instagram, "_blank", "noopener,noreferrer")}
                    type="button"
                  >
                    <img alt="" src={instagramIcon} />
                  </button>
                  <button
                    aria-label={ui("Compartir por correo")}
                    onClick={() => window.open(shareLinks.mail, "_self")}
                    type="button"
                  >
                    <img alt="" src={mailIcon} />
                  </button>
                  <button
                    aria-label={ui("Abrir TikTok")}
                    onClick={() => window.open(shareLinks.tiktok, "_blank", "noopener,noreferrer")}
                    type="button"
                  >
                    <img alt="" src={tiktokIcon} />
                  </button>
              </div>
            </div>
          </article>
        </section>
      ) : null}

      {activeTab === "stories" ? (
        <section className={styles.placeholderSection}>
          <article className={styles.libraryCard}>
            <div className={styles.libraryHeader}>
              <div>
                <span>{ui("Historias del creador")}</span>
                <h2>{visibleStories.length}{ui(" historias publicadas por ")}{visibleDisplayName}</h2>
              </div>
            </div>

            <div className={styles.storyShelfWrap}>
              {visibleStories.length > 0 ? (
                <HomeShelf
                  onOpenAuthor={(authorId) =>
                    onNavigate("creator-profile", { profileId: authorId })
                  }
                  onOpenStory={(story) =>
                    onNavigate("reading", { storyIdentifier: story.id })
                  }
                  section={{
                    title: "",
                    subtitle: "",
                    stories: visibleStories.slice(0, 6).map((story) => ({
                      id: story.id,
                      title: story.title,
                      author: story.author,
                      authorId: story.authorId,
                      cover: story.cover,
                      reads: story.reads_count || story.reads || 0,
                      ratingAverage: story.rating_average || story.ratingAverage || 0,
                      ratingCount: story.rating_count || story.ratingCount || 0
                    }))
                  }}
                />
              ) : (
                <div className={styles.emptyShelf}>
                  <p>{ui("Este perfil aun no tiene historias publicadas.")}</p>
                </div>
              )}
            </div>
          </article>
        </section>
      ) : null}

      {activeTab === "wall" ? (
        <section className={styles.wallLayout}>
          <div className={styles.wallFeed}>
            {wallMessage ? <p className={styles.wallMessage}>{ui(wallMessage)}</p> : null}
            {wallStatus === "loading" ? (
              <p className={styles.wallMessage}>{ui("Cargando muro del creador...")}</p>
            ) : null}

            {wallPosts.map((post) => (
              <article key={post.id} className={styles.wallCard}>
                <div className={styles.wallCardHeader}>
                  <div className={styles.wallAuthor}>
                    <div className={styles.wallAvatarMuted}>
                      {post.authorAvatarUrl ? (
                        <img
                          alt={post.authorName || ui("Autor")}
                          className={styles.wallAvatarImage}
                          src={post.authorAvatarUrl}
                        />
                      ) : (
                        post.authorName?.slice(0, 1).toUpperCase() || ui("V")
                      )}
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
                      toggleWallMenu({ type: "post", postId: post.id });
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
                    onClick={() => {
                      if (!auth.isAuthenticated) {
                        setWallMessage("Debes iniciar sesion para realizar esta accion.");
                        return;
                      }

                      setReplyTargets((current) => ({ ...current, [post.id]: null }));
                    }}
                    type="button"
                  >{ui(" Responder ")}</button>
                  <span>{(post.comments || []).length}{ui(" comentarios")}</span>
                </div>

                <div className={styles.wallReplies}>
                  {(post.comments || []).map((comment) => renderWallComment(comment, post.id))}
                </div>

                {auth.isAuthenticated ? (
                  <div className={styles.wallReplyComposer}>
                    <div className={styles.wallAvatar}>
                      {auth.user?.avatarUrl ? (
                        <img
                          alt={auth.user?.displayName || ui("Usuario")}
                          className={styles.wallAvatarImage}
                          src={auth.user.avatarUrl}
                        />
                      ) : (
                        (auth.user?.displayName || "L").slice(0, 1).toUpperCase()
                      )}
                    </div>
                    <div className={styles.wallComposerBody}>
                      {replyTargets[post.id] ? (
                        <div className={styles.replyTargetPill}>{ui(" Respondiendo a ")}{replyTargets[post.id].authorName}
                          <button
                            onClick={() =>
                              setReplyTargets((current) => ({
                                ...current,
                                [post.id]: null
                              }))
                            }
                            type="button"
                          >{ui(" × ")}</button>
                        </div>
                      ) : null}
                      <textarea
                        placeholder={ui("Escribe una respuesta...")}
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
                          {submittingCommentPostId === post.id
                            ? ui("Publicando...")
                            : ui("Publicar comentario")}
                        </button>
                      </div>
                    </div>
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
                <span>{ui("Siguiendo")}</span>
                <h2>{followingProfiles.length}{ui(" perfiles en su circulo creativo")}</h2>
              </div>
            </div>
            <div className={styles.shelf}>
              {followingProfiles.length > 0 ? (
                followingProfiles.slice(0, 4).map((creator) => (
                  <article
                    key={creator.id}
                    className={`${styles.followCard} ${styles.storyCardClickable}`}
                    onClick={() => onNavigate("creator-profile", { profileId: creator.id })}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onNavigate("creator-profile", { profileId: creator.id });
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className={styles.followCardCover}>
                      {creator.cover || creator.coverUrl ? (
                        <img src={creator.cover || creator.coverUrl} alt={creator.displayName} />
                      ) : null}
                    </div>
                    <div className={styles.followCardAvatar}>
                      {creator.avatarUrl ? (
                        <img
                          alt={creator.displayName}
                          className={styles.followCardAvatarImage}
                          src={creator.avatarUrl}
                        />
                      ) : (
                        creator.displayName?.slice(0, 1).toUpperCase() || ui("C")
                      )}
                    </div>
                    <div className={styles.followCardBody}>
                      <strong>{creator.displayName}</strong>
                      <small>{creator.handle || buildHandle(creator.displayName)}</small>
                      <div className={styles.followCardButton}>{ui("Perfil creativo")}</div>
                      <div className={styles.followCardStats}>
                        <div>
                          <strong>{creator.worksCount || 0}</strong>
                          <span>{ui("Obras")}</span>
                        </div>
                        <div>
                          <strong>{creator.followingCount || 0}</strong>
                          <span>{ui("Siguiendo")}</span>
                        </div>
                        <div>
                          <strong>{creator.followerCount || 0}</strong>
                          <span>{ui("Seguidores")}</span>
                        </div>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className={styles.emptyShelf}>
                  <p>{ui("Este creador aun no sigue a otros perfiles.")}</p>
                </div>
              )}
            </div>
          </article>
        </section>
      ) : null}

      {activeTab === "illustrations" ? (
        <section className={styles.placeholderSection}>
          <article className={styles.libraryCard}>
            <div className={styles.libraryHeader}>
              <div>
                <span>{ui("Ilustraciones del creador")}</span>
                <h2>{visibleIllustrations.length}{ui(" piezas visuales publicadas por ")}{visibleDisplayName}</h2>
              </div>
            </div>

            <div className={styles.illustrationShelf}>
              {illustrationStatus === "loading" ? (
                <div className={styles.emptyShelf}>
                  <p>{ui("Cargando ilustraciones del creador...")}</p>
                </div>
              ) : null}

              {illustrationStatus !== "loading" && visibleIllustrations.length > 0
                ? visibleIllustrations.slice(0, 6).map((illustration) => (
                    <article
                      key={illustration.id}
                      className={`${styles.illustrationProfileVisualCard} ${styles.storyCardClickable}`}
                      onClick={() =>
                        onNavigate("illustration-detail", {
                          illustrationIdentifier: illustration.slug || illustration.id
                        })
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onNavigate("illustration-detail", {
                            illustrationIdentifier: illustration.slug || illustration.id
                          });
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className={styles.illustrationProfileVisualMedia}>
                        <img src={illustration.coverUrl} alt={illustration.title} />
                        <div className={styles.illustrationProfileOverlay}>
                          <strong>{illustration.title}</strong>
                        </div>
                      </div>
                      <div className={styles.illustrationProfileVisualBody}>
                        <small>{illustration.categories?.slice(0, 2).join(" · ") || ui("Ilustracion")}</small>
                        <div className={styles.illustrationProfileVisualStats}>
                          <span>{illustration.likesCount || 0}{ui(" me gusta")}</span>
                          <span>{illustration.commentsCount || 0}{ui(" comentarios")}</span>
                        </div>
                      </div>
                    </article>
                  ))
                : null}

              {illustrationStatus !== "loading" && visibleIllustrations.length === 0 ? (
                <div className={styles.emptyShelf}>
                  <p>{ui("Este creador aun no tiene ilustraciones publicadas.")}</p>
                </div>
              ) : null}
            </div>
          </article>
        </section>
      ) : null}
      </main>
      {reportTarget && <ReportDialog target={reportTarget} auth={auth} onClose={()=>setReportTarget(null)} onSent={setWallMessage} />}
    </AppShell>
  );
}

