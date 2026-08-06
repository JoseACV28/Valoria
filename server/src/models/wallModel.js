// Modelo del muro de creador.
// Administra publicaciones del creador, comentarios de seguidores, respuestas y likes.
import { randomUUID } from "node:crypto";
import {
  demoWallCommentLikes,
  demoWallComments,
  demoWallPosts
} from "../data/demoStore.js";
import { isSupabaseEnabled, supabaseAdmin } from "../config/supabase.js";

function mapPost(post) {
  // Normaliza una publicacion del muro al shape consumido por el frontend.
  return {
    ...post,
    creatorId: post.creator_id,
    authorId: post.author_id,
    authorName: post.author_name,
    authorAvatarUrl: post.author_avatar_url || "",
    isEditableByCurrentUser: Boolean(post.is_editable_by_current_user),
    comments: post.comments || []
  };
}

function mapComment(comment) {
  // Normaliza comentarios y replies del muro para la UI social.
  return {
    ...comment,
    creatorId: comment.creator_id,
    authorId: comment.author_id,
    authorName: comment.author_name,
    authorAvatarUrl: comment.author_avatar_url || "",
    parentCommentId: comment.parent_comment_id || null,
    likesCount: Number(comment.likes_count || 0),
    likedByCurrentUser: Boolean(comment.liked_by_current_user),
    isEditableByCurrentUser: Boolean(comment.is_editable_by_current_user),
    isDeletableByCurrentUser: Boolean(comment.is_deletable_by_current_user),
    replies: comment.replies || []
  };
}

function buildCommentTree(comments) {
  // Convierte una lista plana de comentarios en una jerarquia con respuestas anidadas.
  const mapped = comments.map((comment) => ({
    ...mapComment(comment),
    replies: []
  }));
  const byId = new Map(mapped.map((comment) => [comment.id, comment]));
  const roots = [];

  mapped.forEach((comment) => {
    if (comment.parentCommentId && byId.has(comment.parentCommentId)) {
      byId.get(comment.parentCommentId).replies.push(comment);
      return;
    }

    roots.push(comment);
  });

  mapped.forEach((comment) => {
    comment.replies.sort(
      (first, second) => new Date(first.created_at) - new Date(second.created_at)
    );
  });

  return roots.sort(
    (first, second) => new Date(first.created_at) - new Date(second.created_at)
  );
}

function enrichCommentPermissions(comment, currentUserId, creatorId, likedCommentIds = new Set()) {
  // Calcula permisos de edicion/borrado y el estado de like para cada comentario.
  return {
    ...comment,
    liked_by_current_user: likedCommentIds.has(comment.id),
    is_editable_by_current_user: Boolean(currentUserId && comment.author_id === currentUserId),
    is_deletable_by_current_user: Boolean(
      currentUserId &&
        (comment.author_id === currentUserId || creatorId === currentUserId)
    )
  };
}

function isMissingLikesTableError(message = "") {
  // Detecta instalaciones parciales donde aun falta la tabla de likes del muro.
  return message.includes("creator_wall_comment_likes");
}

async function attachAuthorProfiles(posts, comments) {
  // Inyecta avatares reales de perfil en posts y comentarios del muro.
  const authorIds = [
    ...new Set(
      [...posts, ...comments]
        .map((item) => item.author_id)
        .filter(Boolean)
    )
  ];

  if (!isSupabaseEnabled() || authorIds.length === 0) {
    return { posts, comments };
  }

  const { data: profiles, error } = await supabaseAdmin
    .from("profiles")
    .select("id, avatar_url")
    .in("id", authorIds);

  if (error) {
    throw new Error(error.message);
  }

  const byId = new Map((profiles || []).map((profile) => [profile.id, profile.avatar_url || ""]));

  return {
    posts: posts.map((post) => ({
      ...post,
      author_avatar_url: byId.get(post.author_id) || ""
    })),
    comments: comments.map((comment) => ({
      ...comment,
      author_avatar_url: byId.get(comment.author_id) || ""
    }))
  };
}

export class WallModel {
  static async getCommentById(commentId) {
    // Recupera un comentario puntual del muro para resolver destinatarios de notificacion.
    if (!commentId) {
      return null;
    }

    if (!isSupabaseEnabled()) {
      const comment = demoWallComments.find((item) => item.id === commentId);
      return comment ? mapComment(comment) : null;
    }

    const { data, error } = await supabaseAdmin
      .from("creator_wall_comments")
      .select("*")
      .eq("id", commentId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data ? mapComment(data) : null;
  }

  static async getCommunityFeed(limit = 6) {
    // Construye la muestra resumida de actividad social usada en el home.
    if (!isSupabaseEnabled()) {
      return [];
    }

    const { data: posts, error: postsError } = await supabaseAdmin
      .from("creator_wall_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (postsError) {
      throw new Error(postsError.message);
    }

    if (!posts.length) {
      return [];
    }

    const creatorIds = [...new Set(posts.map((post) => post.creator_id).filter(Boolean))];

    const [{ data: profiles, error: profilesError }, { data: stories, error: storiesError }, { data: comments, error: commentsError }, { data: follows, error: followsError }] =
      await Promise.all([
        supabaseAdmin.from("profiles").select("*").in("id", creatorIds),
        supabaseAdmin
          .from("stories")
          .select("id, author_id, cover_url, status, created_at")
          .in("author_id", creatorIds),
        supabaseAdmin
          .from("creator_wall_comments")
          .select("id, post_id")
          .in(
            "post_id",
            posts.map((post) => post.id)
          ),
        supabaseAdmin
          .from("profile_follows")
          .select("followed_id")
          .in("followed_id", creatorIds)
      ]);

    if (profilesError) {
      throw new Error(profilesError.message);
    }
    if (storiesError) {
      throw new Error(storiesError.message);
    }
    if (commentsError) {
      throw new Error(commentsError.message);
    }
    if (followsError) {
      throw new Error(followsError.message);
    }

    const profileById = new Map((profiles || []).map((profile) => [profile.id, profile]));
    const storiesByAuthor = new Map();
    const followerCountByCreator = new Map();
    const commentCountByPost = new Map();

    for (const story of stories || []) {
      if (!storiesByAuthor.has(story.author_id)) {
        storiesByAuthor.set(story.author_id, []);
      }
      storiesByAuthor.get(story.author_id).push(story);
    }

    for (const follow of follows || []) {
      followerCountByCreator.set(
        follow.followed_id,
        Number(followerCountByCreator.get(follow.followed_id) || 0) + 1
      );
    }

    for (const comment of comments || []) {
      commentCountByPost.set(
        comment.post_id,
        Number(commentCountByPost.get(comment.post_id) || 0) + 1
      );
    }

    return posts.map((post) => {
      const creatorProfile = profileById.get(post.creator_id);
      const creatorStories = (storiesByAuthor.get(post.creator_id) || []).filter(
        (story) => story.status === "published"
      );

      return {
        id: post.id,
        creatorId: post.creator_id,
        creatorName:
          creatorProfile?.display_name || post.author_name || "Creador de Valoria",
        creatorHandle: `@${String(
          creatorProfile?.display_name || post.author_name || "valoria"
        )
          .toLowerCase()
          .replace(/\s+/g, "")}`,
        creatorAvatarUrl: creatorProfile?.avatar_url || "",
        creatorCoverUrl:
          creatorProfile?.cover_url ||
          creatorStories[0]?.cover_url ||
          "",
        storyCount: creatorStories.length,
        followerCount: Number(followerCountByCreator.get(post.creator_id) || 0),
        commentCount: Number(commentCountByPost.get(post.id) || 0),
        content: post.content,
        createdAt: post.created_at
      };
    });
  }

  static async getByCreatorId(creatorId, currentUserId = null) {
    // Devuelve el muro completo de un creador con permisos y likes del visitante.
    if (!isSupabaseEnabled()) {
      const posts = demoWallPosts
        .filter((post) => post.creator_id === creatorId)
        .sort((first, second) => new Date(second.created_at) - new Date(first.created_at))
        .map((post) => {
          const comments = demoWallComments
            .filter((comment) => comment.post_id === post.id)
            .map((comment) =>
              enrichCommentPermissions(
                comment,
                currentUserId,
                creatorId,
                new Set(
                  demoWallCommentLikes
                    .filter((like) => like.user_id === currentUserId)
                    .map((like) => like.comment_id)
                )
              )
            );

          return mapPost({
            ...post,
            is_editable_by_current_user:
              Boolean(currentUserId && post.author_id === currentUserId),
            comments: buildCommentTree(comments)
          });
        });

      return posts;
    }

    const { data: posts, error: postsError } = await supabaseAdmin
      .from("creator_wall_posts")
      .select("*")
      .eq("creator_id", creatorId)
      .order("created_at", { ascending: false });

    if (postsError) {
      throw new Error(postsError.message);
    }

    if (posts.length === 0) {
      return [];
    }

    const postIds = posts.map((post) => post.id);

    const { data: comments, error: commentsError } = await supabaseAdmin
      .from("creator_wall_comments")
      .select("*")
      .in("post_id", postIds)
      .order("created_at", { ascending: true });

    if (commentsError) {
      throw new Error(commentsError.message);
    }

    let likedCommentIds = new Set();

    if (currentUserId && comments.length > 0) {
      const { data: likes, error: likesError } = await supabaseAdmin
        .from("creator_wall_comment_likes")
        .select("comment_id")
        .eq("user_id", currentUserId)
        .in(
          "comment_id",
          comments.map((comment) => comment.id)
        );

      if (likesError && !isMissingLikesTableError(likesError.message)) {
        throw new Error(likesError.message);
      }

      likedCommentIds = new Set((likes || []).map((like) => like.comment_id));
    }

    const withProfiles = await attachAuthorProfiles(posts, comments);

    return withProfiles.posts.map((post) => {
      const postComments = withProfiles.comments
        .filter((comment) => comment.post_id === post.id)
        .map((comment) =>
          enrichCommentPermissions(comment, currentUserId, creatorId, likedCommentIds)
        );

      return mapPost({
        ...post,
        is_editable_by_current_user:
          Boolean(currentUserId && post.author_id === currentUserId),
        comments: buildCommentTree(postComments)
      });
    });
  }

  static async createPost(creatorId, input) {
    // Inserta una nueva publicacion de estado en el muro del creador.
    const payload = {
      creator_id: creatorId,
      author_id: input.authorId,
      author_name: input.authorName,
      content: input.content
    };

    if (!isSupabaseEnabled()) {
      const post = {
        id: randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...payload
      };
      demoWallPosts.unshift(post);
      return mapPost({
        ...post,
        is_editable_by_current_user: true,
        comments: []
      });
    }

    const { data, error } = await supabaseAdmin
      .from("creator_wall_posts")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapPost({
      ...data,
      is_editable_by_current_user: true,
      comments: []
    });
  }

  static async updatePost(creatorId, postId, input, currentUserId) {
    // Actualiza el contenido de una publicacion existente del muro.
    if (!isSupabaseEnabled()) {
      const post = demoWallPosts.find(
        (item) => item.id === postId && item.creator_id === creatorId
      );

      if (!post) {
        throw new Error("Publicacion no encontrada");
      }

      if (post.author_id !== currentUserId) {
        throw new Error("No puedes editar esta publicacion");
      }

      post.content = input.content;
      post.updated_at = new Date().toISOString();

      const comments = demoWallComments.filter((comment) => comment.post_id === post.id);

      return mapPost({
        ...post,
        is_editable_by_current_user: true,
        comments: buildCommentTree(comments)
      });
    }

    const { data: existing, error: lookupError } = await supabaseAdmin
      .from("creator_wall_posts")
      .select("*")
      .eq("id", postId)
      .eq("creator_id", creatorId)
      .single();

    if (lookupError) {
      throw new Error(lookupError.message);
    }

    if (existing.author_id !== currentUserId) {
      throw new Error("No puedes editar esta publicacion");
    }

    const { data, error } = await supabaseAdmin
      .from("creator_wall_posts")
      .update({
        content: input.content,
        updated_at: new Date().toISOString()
      })
      .eq("id", postId)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const { data: comments } = await supabaseAdmin
      .from("creator_wall_comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    return mapPost({
      ...data,
      is_editable_by_current_user: true,
      comments: buildCommentTree(comments || [])
    });
  }

  static async deletePost(creatorId, postId, currentUserId) {
    // Elimina una publicacion del muro y su cascada social asociada.
    if (!isSupabaseEnabled()) {
      const index = demoWallPosts.findIndex(
        (item) => item.id === postId && item.creator_id === creatorId
      );

      if (index === -1) {
        throw new Error("Publicacion no encontrada");
      }

      const post = demoWallPosts[index];

      if (!(post.author_id === currentUserId || creatorId === currentUserId)) {
        throw new Error("No puedes eliminar esta publicacion");
      }

      const commentIds = demoWallComments
        .filter((comment) => comment.post_id === postId)
        .map((comment) => comment.id);

      demoWallPosts.splice(index, 1);

      for (let current = demoWallComments.length - 1; current >= 0; current -= 1) {
        if (demoWallComments[current].post_id === postId) {
          demoWallComments.splice(current, 1);
        }
      }

      for (let current = demoWallCommentLikes.length - 1; current >= 0; current -= 1) {
        if (commentIds.includes(demoWallCommentLikes[current].comment_id)) {
          demoWallCommentLikes.splice(current, 1);
        }
      }

      return;
    }

    const { data: existing, error: lookupError } = await supabaseAdmin
      .from("creator_wall_posts")
      .select("*")
      .eq("id", postId)
      .eq("creator_id", creatorId)
      .single();

    if (lookupError) {
      throw new Error(lookupError.message);
    }

    if (!(existing.author_id === currentUserId || creatorId === currentUserId)) {
      throw new Error("No puedes eliminar esta publicacion");
    }

    const { error } = await supabaseAdmin
      .from("creator_wall_posts")
      .delete()
      .eq("id", postId);

    if (error) {
      throw new Error(error.message);
    }
  }

  static async createComment(creatorId, postId, input) {
    // Inserta un comentario o reply dentro de una publicacion del muro.
    const payload = {
      creator_id: creatorId,
      post_id: postId,
      author_id: input.authorId,
      author_name: input.authorName,
      parent_comment_id: input.parentCommentId || null,
      content: input.content,
      likes_count: 0
    };

    if (!isSupabaseEnabled()) {
      const comment = {
        id: randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...payload
      };
      demoWallComments.push(comment);
      return mapComment({
        ...comment,
        liked_by_current_user: false,
        is_editable_by_current_user: true,
        is_deletable_by_current_user: true
      });
    }

    const { data, error } = await supabaseAdmin
      .from("creator_wall_comments")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapComment({
      ...data,
      liked_by_current_user: false,
      is_editable_by_current_user: true,
      is_deletable_by_current_user: true
    });
  }

  static async updateComment(creatorId, commentId, input, currentUserId) {
    // Modifica el contenido de un comentario del muro.
    if (!isSupabaseEnabled()) {
      const comment = demoWallComments.find(
        (item) => item.id === commentId && item.creator_id === creatorId
      );

      if (!comment) {
        throw new Error("Comentario no encontrado");
      }

      if (comment.author_id !== currentUserId) {
        throw new Error("No puedes editar este comentario");
      }

      comment.content = input.content;
      comment.updated_at = new Date().toISOString();

      return mapComment({
        ...comment,
        liked_by_current_user: false,
        is_editable_by_current_user: true,
        is_deletable_by_current_user: true
      });
    }

    const { data: existing, error: lookupError } = await supabaseAdmin
      .from("creator_wall_comments")
      .select("*")
      .eq("id", commentId)
      .eq("creator_id", creatorId)
      .single();

    if (lookupError) {
      throw new Error(lookupError.message);
    }

    if (existing.author_id !== currentUserId) {
      throw new Error("No puedes editar este comentario");
    }

    const { data, error } = await supabaseAdmin
      .from("creator_wall_comments")
      .update({
        content: input.content,
        updated_at: new Date().toISOString()
      })
      .eq("id", commentId)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapComment({
      ...data,
      liked_by_current_user: false,
      is_editable_by_current_user: true,
      is_deletable_by_current_user: true
    });
  }

  static async deleteComment(creatorId, commentId, currentUserId) {
    // Elimina un comentario del muro junto a replies y likes dependientes cuando aplica.
    if (!isSupabaseEnabled()) {
      const index = demoWallComments.findIndex(
        (item) => item.id === commentId && item.creator_id === creatorId
      );

      if (index === -1) {
        throw new Error("Comentario no encontrado");
      }

      const comment = demoWallComments[index];

      if (!(comment.author_id === currentUserId || creatorId === currentUserId)) {
        throw new Error("No puedes eliminar este comentario");
      }

      const replyIds = demoWallComments
        .filter((item) => item.parent_comment_id === commentId)
        .map((item) => item.id);
      const allIds = [commentId, ...replyIds];

      for (let current = demoWallComments.length - 1; current >= 0; current -= 1) {
        if (allIds.includes(demoWallComments[current].id)) {
          demoWallComments.splice(current, 1);
        }
      }

      for (let current = demoWallCommentLikes.length - 1; current >= 0; current -= 1) {
        if (allIds.includes(demoWallCommentLikes[current].comment_id)) {
          demoWallCommentLikes.splice(current, 1);
        }
      }

      return;
    }

    const { data: existing, error: lookupError } = await supabaseAdmin
      .from("creator_wall_comments")
      .select("*")
      .eq("id", commentId)
      .eq("creator_id", creatorId)
      .single();

    if (lookupError) {
      throw new Error(lookupError.message);
    }

    if (!(existing.author_id === currentUserId || creatorId === currentUserId)) {
      throw new Error("No puedes eliminar este comentario");
    }

    const { error } = await supabaseAdmin
      .from("creator_wall_comments")
      .delete()
      .eq("id", commentId);

    if (error) {
      throw new Error(error.message);
    }
  }

  static async likeComment(creatorId, commentId, userId) {
    // Alterna el like del usuario sobre un comentario del muro.
    if (!userId) {
      throw new Error("Debes iniciar sesion para dar me gusta");
    }

    if (!isSupabaseEnabled()) {
      const comment = demoWallComments.find(
        (item) => item.id === commentId && item.creator_id === creatorId
      );

      if (!comment) {
        throw new Error("Comentario no encontrado");
      }

      const alreadyLiked = demoWallCommentLikes.some(
        (like) => like.comment_id === commentId && like.user_id === userId
      );

      if (alreadyLiked) {
        for (let current = demoWallCommentLikes.length - 1; current >= 0; current -= 1) {
          if (
            demoWallCommentLikes[current].comment_id === commentId &&
            demoWallCommentLikes[current].user_id === userId
          ) {
            demoWallCommentLikes.splice(current, 1);
          }
        }
        comment.likes_count = Math.max(0, Number(comment.likes_count || 0) - 1);
        return mapComment({
          ...comment,
          liked_by_current_user: false,
          is_editable_by_current_user: comment.author_id === userId,
          is_deletable_by_current_user:
            comment.author_id === userId || creatorId === userId
        });
      }

      demoWallCommentLikes.push({
        id: randomUUID(),
        comment_id: commentId,
        user_id: userId,
        created_at: new Date().toISOString()
      });
      comment.likes_count = Number(comment.likes_count || 0) + 1;

      return mapComment({
        ...comment,
        liked_by_current_user: true,
        is_editable_by_current_user: comment.author_id === userId,
        is_deletable_by_current_user:
          comment.author_id === userId || creatorId === userId
      });
    }

    const { data: existingLike, error: existingLikeError } = await supabaseAdmin
      .from("creator_wall_comment_likes")
      .select("id")
      .eq("comment_id", commentId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existingLikeError && !isMissingLikesTableError(existingLikeError.message)) {
      throw new Error(existingLikeError.message);
    }

    const { data: current, error: currentError } = await supabaseAdmin
      .from("creator_wall_comments")
      .select("*")
      .eq("id", commentId)
      .eq("creator_id", creatorId)
      .single();

    if (currentError) {
      throw new Error(currentError.message);
    }

    if (existingLike) {
      const { error: deleteLikeError } = await supabaseAdmin
        .from("creator_wall_comment_likes")
        .delete()
        .eq("id", existingLike.id);

      if (deleteLikeError) {
        throw new Error(deleteLikeError.message);
      }

      const { data, error } = await supabaseAdmin
        .from("creator_wall_comments")
        .update({ likes_count: Math.max(0, Number(current.likes_count || 0) - 1) })
        .eq("id", commentId)
        .select("*")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return mapComment({
        ...data,
        liked_by_current_user: false,
        is_editable_by_current_user: data.author_id === userId,
        is_deletable_by_current_user:
          data.author_id === userId || creatorId === userId
      });
    }

    if (!existingLikeError) {
      const { error: insertLikeError } = await supabaseAdmin
        .from("creator_wall_comment_likes")
        .insert({
          comment_id: commentId,
          user_id: userId
        });

      if (insertLikeError) {
        throw new Error(insertLikeError.message);
      }
    }

    const { data, error } = await supabaseAdmin
      .from("creator_wall_comments")
      .update({ likes_count: Number(current.likes_count || 0) + 1 })
      .eq("id", commentId)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapComment({
      ...data,
      liked_by_current_user: true,
      is_editable_by_current_user: data.author_id === userId,
      is_deletable_by_current_user:
        data.author_id === userId || creatorId === userId
    });
  }
}
