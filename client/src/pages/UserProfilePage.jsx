// Perfil personal del usuario autenticado.
// Es independiente de la vista publica del creador.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  createCreatorWallComment,
  createCreatorWallPost,
  deleteCreatorWallComment,
  deleteCreatorWallPost,
  fetchCreatorWall,
  fetchFollowingProfiles,
  fetchProfile,
  uploadProfileAvatar,
  uploadProfileCover,
  updateCreatorWallComment,
  updateCreatorWallPost,
  updateProfile,
  likeCreatorWallComment
} from "../api/profileApi";
import { fetchMyIllustrations } from "../api/illustrationApi";
import { fetchMyStories } from "../api/storyApi";
import facebookIcon from "../assets/facebook-icon.svg";
import instagramIcon from "../assets/instagram-icon.svg";
import mailIcon from "../assets/mail-icon.svg";
import pinterestIcon from "../assets/pinterest-icon.svg";
import tiktokIcon from "../assets/tiktok-icon.svg";
import xIcon from "../assets/x-icon.svg";
import { AppShell } from "../components/layout/AppShell";
import { Navbar } from "../components/layout/Navbar";
import { HomeShelf } from "../components/stories/HomeShelf";
import styles from "../styles/ProfilePage.module.css";

const FOLLOW_EVENT = "valoria-follow-updated";
const FOLLOW_STORAGE_KEY = "valoria-following-cache";
const AUTH_STORAGE_KEY = "valoria-auth";

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

function mergeFollowingProfiles(apiProfiles, cachedProfiles) {
  const map = new Map();

  [...cachedProfiles, ...apiProfiles].forEach((profile) => {
    if (!profile?.id) {
      return;
    }

    map.set(profile.id, {
      worksCount: 0,
      followerCount: 0,
      handle: profile.handle || "",
      cover: profile.cover || profile.coverUrl || "",
      coverUrl: profile.coverUrl || profile.cover || "",
      avatarUrl: profile.avatarUrl || "",
      ...map.get(profile.id),
      ...profile
    });
  });

  return Array.from(map.values());
}

function persistUpdatedSessionProfile(profile) {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw);
    const next = {
      ...parsed,
      user: {
        ...parsed.user,
        displayName: profile.displayName || parsed.user?.displayName,
        realName: profile.realName ?? parsed.user?.realName ?? "",
        bio: profile.bio || "",
        avatarUrl: profile.avatarUrl || "",
        coverUrl: profile.coverUrl || ""
      }
    };

    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next));
  } catch {}
}

function buildHandle(user) {
  const base =
    user?.displayName?.trim().toLowerCase().replace(/\s+/g, "") ||
    user?.email?.split("@")[0] ||
    "valoria";
  return `@${base}`;
}

export function UserProfilePage({ auth, navFilters, onNavigate, initialTab = "info" }) {
  const [stories, setStories] = useState([]);
  const [illustrations, setIllustrations] = useState([]);
  const [illustrationStatus, setIllustrationStatus] = useState("loading");
  const [followingProfiles, setFollowingProfiles] = useState([]);
  const [personalProfile, setPersonalProfile] = useState(null);
  const [status, setStatus] = useState("loading");
  const [activeTab, setActiveTab] = useState("info");
  const [wallPosts, setWallPosts] = useState([]);
  const [wallStatus, setWallStatus] = useState("loading");
  const [wallDraft, setWallDraft] = useState("");
  const [commentDrafts, setCommentDrafts] = useState({});
  const [replyTargets, setReplyTargets] = useState({});
  const [wallMessage, setWallMessage] = useState("");
  const [isPublishingWallPost, setIsPublishingWallPost] = useState(false);
  const [isSavingBio, setIsSavingBio] = useState(false);
  const [submittingCommentPostId, setSubmittingCommentPostId] = useState("");
  const [likingCommentId, setLikingCommentId] = useState("");
  const [savingPostId, setSavingPostId] = useState("");
  const [savingCommentId, setSavingCommentId] = useState("");
  const [wallMenu, setWallMenu] = useState(null);
  const [editingPostId, setEditingPostId] = useState("");
  const [editingPostDraft, setEditingPostDraft] = useState("");
  const [editingCommentId, setEditingCommentId] = useState("");
  const [editingCommentDraft, setEditingCommentDraft] = useState("");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [profileDraft, setProfileDraft] = useState({
    displayName: "",
    realName: "",
    bio: "",
    avatarUrl: "",
    coverUrl: ""
  });
  const [personalBio, setPersonalBio] = useState(auth.user?.bio || "");
  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const visibleDisplayName = isEditingProfile
    ? profileDraft.displayName || auth.user?.displayName || auth.user?.email || "Valoria"
    : personalProfile?.displayName || auth.user?.displayName || auth.user?.email || "Valoria";
  const visibleHandle = personalProfile?.handle || buildHandle({
    displayName: visibleDisplayName,
    email: auth.user?.email
  });
  const visibleAvatarUrl = isEditingProfile
    ? profileDraft.avatarUrl
    : personalProfile?.avatarUrl || "";
  const visibleCoverUrl = isEditingProfile
    ? profileDraft.coverUrl
    : personalProfile?.coverUrl || "";
  const shareLinks = useMemo(
    () =>
      buildProfileShareLinks({
        title: `Descubre el perfil de ${visibleDisplayName} en Valoria`,
        url: `${window.location.origin}${window.location.pathname}#/profile`
      }),
    [visibleDisplayName]
  );

  const publishedStories = useMemo(
    () => stories.filter((story) => story.status === "published"),
    [stories]
  );

  const draftStories = useMemo(
    () => stories.filter((story) => story.status !== "published"),
    [stories]
  );
  const draftIllustrations = useMemo(
    () => illustrations.filter((illustration) => illustration.status !== "published"),
    [illustrations]
  );

  useEffect(() => {
    if (!wallMessage) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setWallMessage(""), 3200);
    return () => window.clearTimeout(timeoutId);
  }, [wallMessage]);

  useEffect(() => {
    setActiveTab(initialTab || "info");
  }, [initialTab]);

  useEffect(() => {
    function closeMenus() {
      setWallMenu(null);
    }

    window.addEventListener("click", closeMenus);
    return () => window.removeEventListener("click", closeMenus);
  }, []);

  useEffect(() => {
    if (!auth.isAuthenticated) {
      return;
    }

    async function loadProfileStories() {
      try {
        const data = await fetchMyStories(auth.token);
        setStories(data.stories);
        setStatus("ready");
      } catch {
        setStatus("error");
      }
    }

    loadProfileStories();
  }, [auth.isAuthenticated, auth.token]);

  useEffect(() => {
    if (!auth.isAuthenticated) {
      return;
    }

    async function loadMyIllustrations() {
      try {
        setIllustrationStatus("loading");
        const data = await fetchMyIllustrations(auth.token);
        setIllustrations(data.illustrations || []);
        setIllustrationStatus("ready");
      } catch {
        setIllustrations([]);
        setIllustrationStatus("error");
      }
    }

    loadMyIllustrations();
  }, [auth.isAuthenticated, auth.token]);

  useEffect(() => {
    if (!auth.isAuthenticated || !auth.user?.id) {
      return;
    }

    async function loadPersonalProfile() {
      try {
        const data = await fetchProfile(auth.user.id, auth.token);
        setPersonalProfile(data.profile || null);
        setPersonalBio(data.profile?.bio || "");
        setProfileDraft({
          displayName:
            data.profile?.displayName || auth.user?.displayName || auth.user?.email || "",
          realName: data.profile?.realName || auth.user?.realName || "",
          bio: data.profile?.bio || "",
          avatarUrl: data.profile?.avatarUrl || "",
          coverUrl: data.profile?.coverUrl || ""
        });
      } catch {}
    }

    loadPersonalProfile();
  }, [auth.isAuthenticated, auth.token, auth.user?.id]);

  useEffect(() => {
    if (!auth.isAuthenticated || !auth.user?.id) {
      return;
    }

    async function loadFollowingProfiles() {
      const cachedProfiles = readFollowCache()[auth.user.id] || [];

      try {
        const data = await fetchFollowingProfiles(auth.user.id, auth.token);
        setFollowingProfiles(
          mergeFollowingProfiles(data.profiles || [], cachedProfiles)
        );
      } catch {
        setFollowingProfiles(mergeFollowingProfiles([], cachedProfiles));
      }
    }

    loadFollowingProfiles();

    function handleFollowUpdated(event) {
      const detail = event.detail || {};

      if (detail.following && detail.creator) {
        setFollowingProfiles((current) =>
          mergeFollowingProfiles(current, [detail.creator])
        );
      } else if (!detail.following && detail.profileId) {
        setFollowingProfiles((current) =>
          current.filter((profile) => profile.id !== detail.profileId)
        );
      }

      loadFollowingProfiles();
    }

    window.addEventListener(FOLLOW_EVENT, handleFollowUpdated);
    return () => window.removeEventListener(FOLLOW_EVENT, handleFollowUpdated);
  }, [auth.isAuthenticated, auth.token, auth.user?.id]);

  useEffect(() => {
    if (!auth.isAuthenticated || !auth.user?.id) {
      return;
    }

    async function loadWall() {
      try {
        setWallStatus("loading");
        const data = await fetchCreatorWall(auth.user.id, auth.token);
        setWallPosts(data.posts || []);
        setWallStatus("ready");
      } catch {
        setWallPosts([]);
        setWallStatus("error");
      }
    }

    loadWall();
  }, [auth.isAuthenticated, auth.token, auth.user?.id]);

  async function reloadWall() {
    if (!auth.user?.id) {
      return;
    }

    const data = await fetchCreatorWall(auth.user.id, auth.token);
    setWallPosts(data.posts || []);
  }

  async function handleCreateWallPost() {
    const content = wallDraft.trim();

    if (!content || !auth.user?.id) {
      return;
    }

    try {
      setIsPublishingWallPost(true);
      await createCreatorWallPost(auth.user.id, { content }, auth.token);
      setWallDraft("");
      setWallMessage("Estado publicado en tu muro.");
      await reloadWall();
    } catch (error) {
      setWallMessage(error.message);
    } finally {
      setIsPublishingWallPost(false);
    }
  }

  function resetProfileDraft() {
    setProfileDraft({
      displayName:
        personalProfile?.displayName || auth.user?.displayName || auth.user?.email || "",
      realName: personalProfile?.realName || auth.user?.realName || "",
      bio: personalProfile?.bio || auth.user?.bio || "",
      avatarUrl: personalProfile?.avatarUrl || "",
      coverUrl: personalProfile?.coverUrl || ""
    });
  }

  async function handleSaveProfile() {
    if (!auth.user?.id) {
      return;
    }

    try {
      setIsSavingBio(true);
      const data = await updateProfile(
        auth.user.id,
        {
          realName: profileDraft.realName,
          displayName: profileDraft.displayName,
          bio: profileDraft.bio,
          avatarUrl: profileDraft.avatarUrl,
          coverUrl: profileDraft.coverUrl
        },
        auth.token
      );
      setPersonalProfile(data.profile || null);
      setPersonalBio(data.profile.bio || "");
      setProfileDraft({
        displayName: data.profile.displayName || "",
        realName: data.profile.realName || "",
        bio: data.profile.bio || "",
        avatarUrl: data.profile.avatarUrl || "",
        coverUrl: data.profile.coverUrl || ""
      });
      auth.updateCurrentUserProfile?.(data.profile);
      persistUpdatedSessionProfile(data.profile);
      setWallMessage("Perfil actualizado.");
      setIsEditingProfile(false);
    } catch (error) {
      setWallMessage(error.message);
    } finally {
      setIsSavingBio(false);
    }
  }

  async function handleUploadProfileImage(kind, file) {
    if (!file || !auth.token) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setWallMessage("Solo puedes subir imagenes para el perfil.");
      return;
    }

    try {
      if (kind === "avatar") {
        setIsUploadingAvatar(true);
        const data = await uploadProfileAvatar(file, "Avatar de perfil", auth.token);
        setProfileDraft((current) => ({
          ...current,
          avatarUrl: data.file.publicUrl
        }));
        setWallMessage("Avatar cargado correctamente.");
        return;
      }

      setIsUploadingCover(true);
      const data = await uploadProfileCover(file, "Fondo de perfil", auth.token);
      setProfileDraft((current) => ({
        ...current,
        coverUrl: data.file.publicUrl
      }));
      setWallMessage("Fondo cargado correctamente.");
    } catch (error) {
      setWallMessage(error.message);
    } finally {
      setIsUploadingAvatar(false);
      setIsUploadingCover(false);
      if (avatarInputRef.current && kind === "avatar") {
        avatarInputRef.current.value = "";
      }
      if (coverInputRef.current && kind === "cover") {
        coverInputRef.current.value = "";
      }
    }
  }

  async function handleSubmitComment(postId) {
    const content = commentDrafts[postId]?.trim();

    if (!content || !auth.user?.id) {
      return;
    }

    try {
      setSubmittingCommentPostId(postId);
      await createCreatorWallComment(
        auth.user.id,
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

  async function handleLikeComment(commentId) {
    if (!auth.user?.id) {
      return;
    }

    try {
      setLikingCommentId(commentId);
      await likeCreatorWallComment(auth.user.id, commentId, auth.token);
      await reloadWall();
    } catch (error) {
      setWallMessage(error.message);
    } finally {
      setLikingCommentId("");
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

  async function handleWallAction(action, target = {}) {
    setWallMenu(null);

    if (action === "report") {
      setWallMessage("Comentario marcado para revision.");
      return;
    }

    if (action === "edit-post") {
      const post = wallPosts.find((item) => item.id === target.postId);
      if (!post) {
        return;
      }
      setEditingPostId(post.id);
      setEditingPostDraft(post.content);
      return;
    }

    if (action === "edit-comment") {
      const stack = [...wallPosts.flatMap((post) => post.comments || [])];
      while (stack.length) {
        const current = stack.shift();
        if (current.id === target.commentId) {
          setEditingCommentId(current.id);
          setEditingCommentDraft(current.content);
          return;
        }
        stack.push(...(current.replies || []));
      }
      return;
    }

    try {
      if (action === "delete-post") {
        await deleteCreatorWallPost(auth.user.id, target.postId, auth.token);
        setWallMessage("Estado eliminado.");
        await reloadWall();
        return;
      }

      if (action === "delete-comment") {
        await deleteCreatorWallComment(auth.user.id, target.commentId, auth.token);
        setWallMessage("Comentario eliminado.");
        await reloadWall();
      }
    } catch (error) {
      setWallMessage(error.message);
    }
  }

  async function handleSavePostEdit(postId) {
    if (!editingPostDraft.trim()) {
      return;
    }

    try {
      setSavingPostId(postId);
      await updateCreatorWallPost(
        auth.user.id,
        postId,
        { content: editingPostDraft.trim() },
        auth.token
      );
      setEditingPostId("");
      setEditingPostDraft("");
      setWallMessage("Estado actualizado.");
      await reloadWall();
    } catch (error) {
      setWallMessage(error.message);
    } finally {
      setSavingPostId("");
    }
  }

  async function handleSaveCommentEdit(commentId) {
    if (!editingCommentDraft.trim()) {
      return;
    }

    try {
      setSavingCommentId(commentId);
      await updateCreatorWallComment(
        auth.user.id,
        commentId,
        { content: editingCommentDraft.trim() },
        auth.token
      );
      setEditingCommentId("");
      setEditingCommentDraft("");
      setWallMessage("Comentario actualizado.");
      await reloadWall();
    } catch (error) {
      setWallMessage(error.message);
    } finally {
      setSavingCommentId("");
    }
  }

  function renderReplies(comments = [], postId, depth = 0) {
    return comments.map((comment) => (
      <div
        key={comment.id}
        className={styles.wallReply}
        style={{ marginLeft: depth > 0 ? `${depth * 24}px` : undefined }}
      >
        <div className={styles.wallReplyRow}>
          <div className={styles.replyAvatar}>
            {comment.authorAvatarUrl ? (
              <img
                alt={comment.authorName || "Autor"}
                className={styles.wallAvatarImage}
                src={comment.authorAvatarUrl}
              />
            ) : (
              comment.authorName?.slice(0, 1).toUpperCase() || "L"
            )}
          </div>
          <div className={styles.replyBody}>
            {editingCommentId === comment.id ? (
              <div className={styles.inlineEditor}>
                <textarea
                  rows="2"
                  value={editingCommentDraft}
                  onChange={(event) => setEditingCommentDraft(event.target.value)}
                />
                <div className={styles.inlineEditorActions}>
                  <button onClick={() => handleSaveCommentEdit(comment.id)} type="button">
                    {savingCommentId === comment.id ? "Guardando..." : "Guardar"}
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
                  <strong>{comment.authorName}</strong> {comment.content}
                </p>
                <div className={styles.wallReplyActions}>
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
                    disabled={likingCommentId === comment.id}
                    type="button"
                  >
                    {(likingCommentId === comment.id
                      ? "Actualizando"
                      : comment.likedByCurrentUser
                        ? "Te gusta"
                        : "Me gusta")}{" "}
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
            <button onClick={() => handleWallAction("report", { postId, commentId: comment.id })} type="button">
              <span className={styles.menuIcon}>⚑</span>
              <span>Reportar comentario</span>
            </button>
            {comment.isEditableByCurrentUser ? (
              <button onClick={() => handleWallAction("edit-comment", { postId, commentId: comment.id })} type="button">
                <span className={styles.menuIcon}>✎</span>
                <span>Editar comentario</span>
              </button>
            ) : null}
            {comment.isDeletableByCurrentUser ? (
              <button className={styles.wallMenuDanger} onClick={() => handleWallAction("delete-comment", { postId, commentId: comment.id })} type="button">
                <span className={styles.menuIcon}>✕</span>
                <span>Eliminar comentario</span>
              </button>
            ) : null}
          </div>
        ) : null}
        {comment.replies?.length ? (
          <div className={styles.wallReplyChildren}>
            {renderReplies(comment.replies, postId, depth + 1)}
          </div>
        ) : null}
      </div>
    ));
  }

  if (!auth.isAuthenticated) {
    return (
      <AppShell auth={auth} currentView="profile" onNavigate={onNavigate}>
        <main className={styles.page}>
          <Navbar auth={auth} currentView="profile" {...navFilters} onNavigate={onNavigate} />
        <section className={styles.emptyState}>
          <span>Perfil</span>
          <h1>Inicia sesion para ver tu perfil</h1>
          <p>Tu perfil personal vive aqui, separado del home y del panel de creador.</p>
          <button onClick={() => onNavigate("login")} type="button">
            Iniciar sesion
          </button>
        </section>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell auth={auth} currentView="profile" onNavigate={onNavigate}>
      <main className={styles.page}>
        <Navbar auth={auth} currentView="profile" {...navFilters} onNavigate={onNavigate} />

      <section
        className={styles.hero}
        style={
          visibleCoverUrl
            ? {
                backgroundImage: `linear-gradient(180deg, rgba(39, 25, 52, 0.18), rgba(39, 25, 52, 0.82)), url("${visibleCoverUrl}")`
              }
            : undefined
        }
      >
        <div className={styles.heroIdentityCard}>
          <div className={styles.avatar}>
            {visibleAvatarUrl ? (
              <img alt={visibleDisplayName} className={styles.avatarImage} src={visibleAvatarUrl} />
            ) : (
              <span>{visibleDisplayName.slice(0, 1).toUpperCase() || "V"}</span>
            )}
          </div>
          <h1>{visibleDisplayName}</h1>
          <p className={styles.handle}>{visibleHandle}</p>

          <div className={styles.metrics}>
            <div>
              <strong>{publishedStories.length}</strong>
              <span>Obras</span>
            </div>
            <div>
              <strong>1</strong>
              <span>Lista de lectura</span>
            </div>
            <div>
              <strong>{personalProfile?.followerCount ?? 0}</strong>
              <span>Seguidores</span>
            </div>
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
          className={activeTab === "stories" ? styles.activeTab : ""}
          onClick={() => setActiveTab("stories")}
          type="button"
        >
          Historias
        </button>
        <button
          className={activeTab === "illustrations" ? styles.activeTab : ""}
          onClick={() => setActiveTab("illustrations")}
          type="button"
        >
          Ilustraciones
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
          <button
            className={styles.editButton}
            onClick={() => {
              if (isEditingProfile) {
                resetProfileDraft();
                setIsEditingProfile(false);
                return;
              }

              resetProfileDraft();
              setIsEditingProfile(true);
            }}
            type="button"
          >
            <span className={styles.editIcon}>⚙</span>
            Edita tu perfil
          </button>
        </div>
      </section>

      {wallMessage ? <p className={styles.wallMessage}>{wallMessage}</p> : null}

      {isEditingProfile ? (
        <section className={styles.profileEditorCard}>
          <div className={styles.profileEditorHeader}>
            <div>
              <span>Editor de perfil</span>
              <h2>Personaliza tu presencia en Valoria</h2>
            </div>
            <div className={styles.profileEditorActions}>
              <button onClick={handleSaveProfile} type="button">
                {isSavingBio ? "Guardando..." : "Guardar cambios"}
              </button>
              <button
                className={styles.composerGhost}
                onClick={() => {
                  resetProfileDraft();
                  setIsEditingProfile(false);
                }}
                type="button"
              >
                Cancelar
              </button>
            </div>
          </div>

          <div className={styles.profileEditorGrid}>
            <div className={styles.profileEditorMediaStack}>
              <div className={styles.profileEditorField}>
                <span>Imagen de fondo</span>
                <div className={styles.profileEditorUploadRow}>
                  <button
                    className={styles.profileUploadButton}
                    onClick={() => coverInputRef.current?.click()}
                    type="button"
                  >
                    {isUploadingCover ? "Subiendo fondo..." : "▣ Cambiar imagen de fondo"}
                  </button>
                  <small>
                    Usa una imagen amplia para que la cabecera mantenga buena presencia visual.
                  </small>
                  <input
                    ref={coverInputRef}
                    accept="image/*"
                    className={styles.hiddenFileInput}
                    onChange={(event) =>
                      handleUploadProfileImage("cover", event.target.files?.[0])
                    }
                    type="file"
                  />
                </div>
              </div>

              <div className={styles.profileEditorField}>
                <span>Imagen de usuario</span>
                <div className={styles.profileEditorUploadRow}>
                  <button
                    className={styles.profileUploadButton}
                    onClick={() => avatarInputRef.current?.click()}
                    type="button"
                  >
                    {isUploadingAvatar ? "Subiendo avatar..." : "◉ Cambiar imagen de usuario"}
                  </button>
                  <small>Ideal para retrato o simbolo del creador.</small>
                  <input
                    ref={avatarInputRef}
                    accept="image/*"
                    className={styles.hiddenFileInput}
                    onChange={(event) =>
                      handleUploadProfileImage("avatar", event.target.files?.[0])
                    }
                    type="file"
                  />
                </div>
              </div>
            </div>

            <div className={styles.profileEditorIdentityStack}>
              <div className={styles.profileEditorIdentityGrid}>
                <label className={styles.profileEditorField}>
                  <span>Seudonimo publico</span>
                  <input
                    type="text"
                    value={profileDraft.displayName}
                    onChange={(event) =>
                      setProfileDraft((current) => ({
                        ...current,
                        displayName: event.target.value
                      }))
                    }
                    placeholder="Como quieres aparecer en Valoria"
                  />
                </label>

                <label className={styles.profileEditorField}>
                  <span>Nombre real</span>
                  <input
                    type="text"
                    value={profileDraft.realName}
                    onChange={(event) =>
                      setProfileDraft((current) => ({
                        ...current,
                        realName: event.target.value
                      }))
                    }
                    placeholder="Visible solo dentro del perfil del creador"
                  />
                </label>
              </div>

              <label className={styles.profileEditorField}>
                <span>Descripcion personal</span>
                <textarea
                  rows="6"
                  value={profileDraft.bio}
                  onChange={(event) =>
                    setProfileDraft((current) => ({
                      ...current,
                      bio: event.target.value
                    }))
                  }
                  placeholder="Describe tu universo creativo, tus gustos o la forma en que quieres presentarte."
                />
              </label>
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "info" ? (
        <>
          <section className={styles.placeholderSection}>
            <article className={`${styles.infoCard} ${styles.infoCardFullWidth}`}>
              <div className={styles.libraryHeader}>
                <div>
                  <h2>Tu espacio personal</h2>
                </div>
                <button
                  className={styles.creatorShortcut}
                  onClick={() => onNavigate("creator")}
                  type="button"
                >
                  Ir al panel de creador
                </button>
              </div>

              <p>
                {personalBio ||
                  "Este perfil resume tu actividad como lector y creador dentro de Valoria."}
              </p>

              <div className={styles.shareBlock}>
                <span>Compartir</span>
                <div className={styles.shareRow}>
                  <button
                    aria-label="Compartir en Facebook"
                    onClick={() => window.open(shareLinks.facebook, "_blank", "noopener,noreferrer")}
                    type="button"
                  >
                    <img alt="" src={facebookIcon} />
                  </button>
                  <button
                    aria-label="Compartir en X"
                    onClick={() => window.open(shareLinks.x, "_blank", "noopener,noreferrer")}
                    type="button"
                  >
                    <img alt="" src={xIcon} />
                  </button>
                  <button
                    aria-label="Compartir en Pinterest"
                    onClick={() => window.open(shareLinks.pinterest, "_blank", "noopener,noreferrer")}
                    type="button"
                  >
                    <img alt="" src={pinterestIcon} />
                  </button>
                  <button
                    aria-label="Abrir Instagram"
                    onClick={() => window.open(shareLinks.instagram, "_blank", "noopener,noreferrer")}
                    type="button"
                  >
                    <img alt="" src={instagramIcon} />
                  </button>
                  <button
                    aria-label="Compartir por correo"
                    onClick={() => window.open(shareLinks.mail, "_self")}
                    type="button"
                  >
                    <img alt="" src={mailIcon} />
                  </button>
                  <button
                    aria-label="Abrir TikTok"
                    onClick={() => window.open(shareLinks.tiktok, "_blank", "noopener,noreferrer")}
                    type="button"
                  >
                    <img alt="" src={tiktokIcon} />
                  </button>
                </div>
              </div>
            </article>
          </section>
        </>
      ) : null}

      {activeTab === "wall" ? (
        <section className={styles.wallLayout}>
          <div className={styles.wallComposer}>
            <div className={styles.wallAvatar}>
              {auth.user?.avatarUrl ? (
                <img
                  alt={auth.user?.displayName || "Usuario"}
                  className={styles.wallAvatarImage}
                  src={auth.user.avatarUrl}
                />
              ) : (
                auth.user?.displayName?.slice(0, 1).toUpperCase() || "V"
              )}
            </div>
            <div className={styles.wallComposerBody}>
              <textarea
                placeholder="Comparte un estado con tus lectores..."
                rows="3"
                value={wallDraft}
                onChange={(event) => setWallDraft(event.target.value)}
              />
              <div className={styles.wallComposerActions}>
                <button onClick={handleCreateWallPost} type="button">
                  {isPublishingWallPost ? "Publicando..." : "Publicar estado"}
                </button>
              </div>
            </div>
          </div>

          <div className={styles.wallFeed}>
            {wallStatus === "loading" ? (
              <p className={styles.wallMessage}>Cargando tus conversaciones...</p>
            ) : null}

            {wallPosts.map((post) => (
              <article key={post.id} className={styles.wallCard}>
                <div className={styles.wallCardHeader}>
                  <div className={styles.wallAuthor}>
                    <div className={styles.wallAvatarMuted}>
                      {post.authorAvatarUrl ? (
                        <img
                          alt={post.authorName || "Autor"}
                          className={styles.wallAvatarImage}
                          src={post.authorAvatarUrl}
                        />
                      ) : (
                        post.authorName?.slice(0, 1).toUpperCase() || "V"
                      )}
                    </div>
                    <div>
                      <strong>{post.authorName}</strong>
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

                {editingPostId === post.id ? (
                  <div className={`${styles.wallContent} ${styles.inlineEditor}`}>
                    <textarea
                      rows="4"
                      value={editingPostDraft}
                      onChange={(event) => setEditingPostDraft(event.target.value)}
                    />
                    <div className={styles.inlineEditorActions}>
                      <button onClick={() => handleSavePostEdit(post.id)} type="button">
                        {savingPostId === post.id ? "Guardando..." : "Guardar"}
                      </button>
                      <button
                        className={styles.composerGhost}
                        onClick={() => {
                          setEditingPostId("");
                          setEditingPostDraft("");
                        }}
                        type="button"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.wallContent}>
                    {post.content.split("\n").map((paragraph, index) => (
                      <p key={`${post.id}-${index}`}>{paragraph}</p>
                    ))}
                  </div>
                )}

                {wallMenu?.type === "post" && wallMenu.postId === post.id ? (
                  <div className={styles.wallMenu} onClick={(event) => event.stopPropagation()}>
                    <button onClick={() => handleWallAction("report", { postId: post.id })} type="button">
                      <span className={styles.menuIcon}>⚑</span>
                      <span>Reportar comentario</span>
                    </button>
                    {post.isEditableByCurrentUser ? (
                      <button onClick={() => handleWallAction("edit-post", { postId: post.id })} type="button">
                        <span className={styles.menuIcon}>✎</span>
                        <span>Editar publicacion</span>
                      </button>
                    ) : null}
                    {post.isEditableByCurrentUser ? (
                      <button className={styles.wallMenuDanger} onClick={() => handleWallAction("delete-post", { postId: post.id })} type="button">
                        <span className={styles.menuIcon}>✕</span>
                        <span>Eliminar publicacion</span>
                      </button>
                    ) : null}
                  </div>
                ) : null}

                <div className={styles.wallPostActions}>
                  <button
                    className={styles.wallActionButton}
                    onClick={() => setReplyTargets((current) => ({ ...current, [post.id]: null }))}
                    type="button"
                  >
                    Responder
                  </button>
                  <span>{(post.comments || []).length} comentarios</span>
                </div>

                <div className={styles.wallReplies}>
                  {renderReplies(post.comments || [], post.id)}
                </div>

                <div className={styles.wallReplyComposer}>
                  <div className={styles.wallAvatar}>
                    {auth.user?.avatarUrl ? (
                      <img
                        alt={auth.user?.displayName || "Usuario"}
                        className={styles.wallAvatarImage}
                        src={auth.user.avatarUrl}
                      />
                    ) : (
                      auth.user?.displayName?.slice(0, 1).toUpperCase() || "V"
                    )}
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
                        {submittingCommentPostId === post.id
                          ? "Publicando..."
                          : "Publicar comentario"}
                      </button>
                    </div>
                  </div>
                </div>
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
                <h2>{followingProfiles.length} creadores en tu circulo</h2>
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
                        creator.displayName?.slice(0, 1).toUpperCase() || "C"
                      )}
                    </div>
                    <div className={styles.followCardBody}>
                      <strong>{creator.displayName}</strong>
                      <small>{creator.handle || buildHandle({ displayName: creator.displayName })}</small>
                      <div className={styles.followCardButton}>Siguiendo</div>
                      <div className={styles.followCardStats}>
                        <div>
                          <strong>{creator.worksCount || 0}</strong>
                          <span>Obras</span>
                        </div>
                        <div>
                          <strong>{creator.followingCount || 0}</strong>
                          <span>Siguiendo</span>
                        </div>
                        <div>
                          <strong>{creator.followerCount || 0}</strong>
                          <span>Seguidores</span>
                        </div>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className={styles.emptyShelf}>
                  <p>Aun no sigues a ningun creador.</p>
                </div>
              )}
            </div>
          </article>
        </section>
      ) : null}

      {activeTab === "stories" ? (
        <section className={styles.placeholderSection}>
          <article className={styles.libraryCard}>
            <div className={styles.libraryHeader}>
              <div>
                <span>Historias creadas</span>
                <h2>
                  {status === "ready"
                    ? `${stories.length} historias en tu universo`
                    : "Cargando tus historias"}
                </h2>
              </div>
              <button
                className={styles.creatorShortcut}
                onClick={() => onNavigate("creator")}
                type="button"
              >
                Ir al panel de creador
              </button>
            </div>

            <div className={styles.storyShelfWrap}>
              {stories.length > 0 ? (
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
                    stories: stories.slice(0, 6).map((story) => ({
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
                  <p>Aun no tienes historias visibles aqui.</p>
                  <button
                    className={styles.creatorShortcut}
                    onClick={() => onNavigate("creator")}
                    type="button"
                  >
                    Crear una historia
                  </button>
                </div>
              )}
            </div>

            {draftStories.length > 0 ? (
              <div className={styles.draftNote}>
                <strong>{draftStories.length} borradores</strong>
                <span>Listos para volver a trabajarse desde el panel.</span>
              </div>
            ) : null}
          </article>
        </section>
      ) : null}

      {activeTab === "illustrations" ? (
        <section className={styles.placeholderSection}>
          <article className={styles.libraryCard}>
            <div className={styles.libraryHeader}>
              <div>
                <span>Tu galeria</span>
                <h2>
                  {illustrationStatus === "ready"
                    ? `${illustrations.length} ilustraciones en tu portafolio`
                    : "Cargando tus ilustraciones"}
                </h2>
              </div>
              <button
                className={styles.creatorShortcut}
                onClick={() => onNavigate("creator")}
                type="button"
              >
                Ir al panel de creador
              </button>
            </div>

            <div className={styles.illustrationShelf}>
              {illustrationStatus === "loading" ? (
                <div className={styles.emptyShelf}>
                  <p>Cargando tu galeria visual...</p>
                </div>
              ) : null}

              {illustrationStatus !== "loading" && illustrations.length > 0
                ? illustrations.slice(0, 6).map((illustration) => (
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
                        <small>
                          {illustration.status === "published" ? "Publicada" : "Borrador"}
                        </small>
                        <div className={styles.illustrationProfileVisualStats}>
                          <span>{illustration.likesCount || 0} me gusta</span>
                          <span>{illustration.commentsCount || 0} comentarios</span>
                        </div>
                      </div>
                    </article>
                  ))
                : null}

              {illustrationStatus !== "loading" && illustrations.length === 0 ? (
                <div className={styles.emptyShelf}>
                  <p>Aun no tienes ilustraciones visibles aqui.</p>
                  <button
                    className={styles.creatorShortcut}
                    onClick={() => onNavigate("creator")}
                    type="button"
                  >
                    Crear una ilustracion
                  </button>
                </div>
              ) : null}
            </div>

            {draftIllustrations.length > 0 ? (
              <div className={styles.draftNote}>
                <strong>{draftIllustrations.length} borradores visuales</strong>
                <span>Listos para volver a trabajarse desde el panel.</span>
              </div>
            ) : null}
          </article>
        </section>
      ) : null}
      </main>
    </AppShell>
  );
}
