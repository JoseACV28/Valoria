// Modelo de perfiles.
// Resuelve perfil publico del creador y relaciones de seguimiento.
import { demoProfileFollows } from "../data/demoStore.js";
import { isSupabaseEnabled, supabaseAdmin } from "../config/supabase.js";
import { StoryModel } from "./storyModel.js";

function mapProfile(profile, stories, followerCount, followingCount, isFollowing, currentUserId) {
  // Construye el perfil publico unificado que consumen vistas propias y ajenas.
  const publishedStories = stories.filter((story) => story.status === "published");
  const isOwnProfile = Boolean(currentUserId && currentUserId === profile.id);

  return {
    id: profile.id,
    displayName: profile.display_name || profile.email,
    realName: isOwnProfile ? profile.real_name || "" : "",
    email: profile.email,
    bio: profile.bio || "",
    avatarUrl: profile.avatar_url || "",
    coverUrl: profile.cover_url || "",
    handle: `@${(profile.display_name || profile.email || "valoria")
      .toLowerCase()
      .replace(/\s+/g, "")}`,
    worksCount: publishedStories.length,
    followerCount,
    followingCount,
    isFollowing,
    isOwnProfile,
    publishedStories
  };
}

export class ProfileModel {
  static async getById(profileId, currentUserId = null) {
    // Resuelve un perfil por id, incluso si parte de su identidad viene de historias o muro.
    if (!isSupabaseEnabled()) {
      const stories = await StoryModel.getByAuthorIdentity(profileId, "Valoria");
      const followerCount = demoProfileFollows.filter((item) => item.followed_id === profileId).length;
      const followingCount = demoProfileFollows.filter((item) => item.follower_id === profileId).length;
      const isFollowing = demoProfileFollows.some(
        (item) => item.followed_id === profileId && item.follower_id === currentUserId
      );

      return mapProfile(
        {
          id: profileId,
          email: "perfil@valoria.app",
          display_name: stories[0]?.author || "Valoria",
          bio: "",
          avatar_url: "",
          cover_url: ""
        },
        stories,
        followerCount,
        followingCount,
        isFollowing,
        currentUserId
      );
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", profileId)
      .maybeSingle();

    if (profileError) {
      throw new Error(profileError.message);
    }

    const { data: wallPost, error: wallPostError } = await supabaseAdmin
      .from("creator_wall_posts")
      .select("author_name")
      .eq("creator_id", profileId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (wallPostError) {
      throw new Error(wallPostError.message);
    }

    const profileCandidates = [
      profile?.display_name,
      profile?.email?.split("@")[0],
      wallPost?.author_name
    ].filter(Boolean);

    let stories = [];

    for (const candidate of profileCandidates) {
      stories = await StoryModel.getByAuthorIdentity(profileId, candidate);
      if (stories.length > 0) {
        break;
      }
    }

    let resolvedProfile = profile;

    if (!resolvedProfile) {
      resolvedProfile = {
        id: profileId,
        email: "",
        real_name: profile?.real_name || "",
        bio: profile?.bio || "",
        avatar_url: profile?.avatar_url || "",
        cover_url: profile?.cover_url || "",
        display_name:
          stories[0]?.author || wallPost?.author_name || "Creador de Valoria"
      };

      if (stories.length === 0) {
        stories = await StoryModel.getByAuthorIdentity(profileId, resolvedProfile.display_name);
      }
    }

    const { count: followerCount, error: followerError } = await supabaseAdmin
      .from("profile_follows")
      .select("*", { count: "exact", head: true })
      .eq("followed_id", profileId);

    if (followerError) {
      throw new Error(followerError.message);
    }

    const { count: followingCount, error: followingError } = await supabaseAdmin
      .from("profile_follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", profileId);

    if (followingError) {
      throw new Error(followingError.message);
    }

    let isFollowing = false;

    if (currentUserId && currentUserId !== profileId) {
      const { data: follow, error: followError } = await supabaseAdmin
        .from("profile_follows")
        .select("id")
        .eq("followed_id", profileId)
        .eq("follower_id", currentUserId)
        .maybeSingle();

      if (followError) {
        throw new Error(followError.message);
      }

      isFollowing = Boolean(follow);
    }

    return mapProfile(
      resolvedProfile,
      stories,
      Number(followerCount || 0),
      Number(followingCount || 0),
      isFollowing,
      currentUserId
    );
  }

  static async follow(profileId, followerId) {
    // Crea la relacion de seguimiento entre dos perfiles.
    if (profileId === followerId) {
      throw new Error("No puedes seguir tu propio perfil");
    }

    if (!isSupabaseEnabled()) {
      const exists = demoProfileFollows.some(
        (item) => item.followed_id === profileId && item.follower_id === followerId
      );

      if (!exists) {
        demoProfileFollows.push({
          followed_id: profileId,
          follower_id: followerId,
          created_at: new Date().toISOString()
        });
      }

      return { following: true };
    }

    const { error } = await supabaseAdmin.from("profile_follows").insert({
      followed_id: profileId,
      follower_id: followerId
    });

    if (error && !error.message.includes("duplicate key")) {
      throw new Error(error.message);
    }

    return { following: true };
  }

  static async unfollow(profileId, followerId) {
    // Elimina la relacion de seguimiento entre dos perfiles.
    if (!isSupabaseEnabled()) {
      const next = demoProfileFollows.findIndex(
        (item) => item.followed_id === profileId && item.follower_id === followerId
      );

      if (next >= 0) {
        demoProfileFollows.splice(next, 1);
      }

      return { following: false };
    }

    const { error } = await supabaseAdmin
      .from("profile_follows")
      .delete()
      .eq("followed_id", profileId)
      .eq("follower_id", followerId);

    if (error) {
      throw new Error(error.message);
    }

    return { following: false };
  }

  static async getFollowingProfiles(profileId, currentUserId = null) {
    // Devuelve perfiles seguidos por un usuario, ya enriquecidos como perfiles publicos.
    if (!isSupabaseEnabled()) {
      const followedIds = demoProfileFollows
        .filter((item) => item.follower_id === profileId)
        .map((item) => item.followed_id);

      return Promise.all(
        followedIds.map((followedId) => this.getById(followedId, currentUserId))
      );
    }

    const { data, error } = await supabaseAdmin
      .from("profile_follows")
      .select("followed_id")
      .eq("follower_id", profileId);

    if (error) {
      throw new Error(error.message);
    }

    return Promise.all(
      (data || []).map((item) => this.getById(item.followed_id, currentUserId))
    );
  }

  static async updateProfile(profileId, input) {
    // Persiste cambios de perfil y sincroniza nombre/avatar/cover en auth y contenido social.
    if (!isSupabaseEnabled()) {
      const stories = await StoryModel.getByAuthorIdentity(profileId, "Valoria");
      return mapProfile(
        {
          id: profileId,
          email: "perfil@valoria.app",
          display_name: input.displayName || stories[0]?.author || "Valoria",
          real_name: input.realName || "",
          bio: input.bio || "",
          avatar_url: input.avatarUrl || "",
          cover_url: input.coverUrl || ""
        },
        stories,
        0,
        0,
        false,
        profileId
      );
    }

    const payload = {
      real_name: input.realName || "",
      bio: input.bio || "",
      avatar_url: input.avatarUrl || "",
      cover_url: input.coverUrl || ""
    };

    if (input.displayName) {
      payload.display_name = input.displayName;
    }

    let result = await supabaseAdmin
      .from("profiles")
      .update(payload)
      .eq("id", profileId)
      .select("*")
      .single();

    if (result.error?.message?.includes("real_name")) {
      const { real_name, ...fallbackPayload } = payload;
      result = await supabaseAdmin
        .from("profiles")
        .update(fallbackPayload)
        .eq("id", profileId)
        .select("*")
        .single();
    }

    const { data, error } = result;

    if (error) {
      throw new Error(error.message);
    }

    const { data: authUserData, error: authUserError } =
      await supabaseAdmin.auth.admin.getUserById(profileId);

    if (authUserError) {
      throw new Error(authUserError.message);
    }

    const currentMetadata = authUserData.user?.user_metadata || {};

    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
      profileId,
      {
        user_metadata: {
          ...currentMetadata,
          display_name: data.display_name || currentMetadata.display_name || "",
          displayName: data.display_name || currentMetadata.displayName || "",
          real_name: data.real_name || "",
          realName: data.real_name || "",
          avatar_url: data.avatar_url || "",
          avatarUrl: data.avatar_url || "",
          cover_url: data.cover_url || "",
          coverUrl: data.cover_url || ""
        }
      }
    );

    if (authUpdateError) {
      throw new Error(authUpdateError.message);
    }

    if (input.displayName) {
      await Promise.all([
        supabaseAdmin
          .from("stories")
          .update({ author_name: input.displayName })
          .eq("author_id", profileId),
        supabaseAdmin
          .from("creator_wall_posts")
          .update({ author_name: input.displayName })
          .eq("author_id", profileId),
        supabaseAdmin
          .from("creator_wall_comments")
          .update({ author_name: input.displayName })
          .eq("author_id", profileId)
      ]);
    }

    const stories = await StoryModel.getByAuthorIdentity(
      profileId,
      data.display_name || data.email || ""
    );

    const { count: followerCount } = await supabaseAdmin
      .from("profile_follows")
      .select("*", { count: "exact", head: true })
      .eq("followed_id", profileId);

    const { count: followingCount } = await supabaseAdmin
      .from("profile_follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", profileId);

    return mapProfile(
      data,
      stories,
      Number(followerCount || 0),
      Number(followingCount || 0),
      false,
      profileId
    );
  }
}
