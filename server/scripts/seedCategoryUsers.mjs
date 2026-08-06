// Seed de usuarios y contenido por categoria para pruebas visuales.
// Crea una cuenta real por categoria, una historia publicada y un capitulo
// inicial con texto ficticio. El script es re-ejecutable e idempotente.
import { ALL_CATEGORIES } from "../../client/src/data/categories.js";
import { supabaseAdmin, isSupabaseEnabled } from "../src/config/supabase.js";
import { slugify } from "../src/utils/slugify.js";

const DEFAULT_PASSWORD = "Valoria2026!";
const CHAPTER_COUNT = 3;
const ILLUSTRATION_COUNT = 1;

const CREATOR_PROFILES = [
  { name: "Luna Varela", style: "susurros, emociones y promesas a medianoche" },
  { name: "Bruno Leal", style: "humor rapido, caos tierno y escenas cotidianas" },
  { name: "Emma Corvalan", style: "mundos imposibles con reglas muy humanas" },
  { name: "Gael Navarro", style: "fandoms, guiños y pasiones de comunidad" },
  { name: "Mara del Sol", style: "relatos breves que dejan eco" },
  { name: "Noa Salvatierra", style: "presencias extrañas y silencios que inquietan" },
  { name: "Iris Montalva", style: "sombras, puertas cerradas y latidos tensos" },
  { name: "Teo Serrano", style: "enigmas, pistas y giros de ultima pagina" },
  { name: "Aline Rios", style: "voces valientes, deseo y descubrimiento" },
  { name: "Milo Zamora", style: "aventuras jovenes, amistades intensas y primeras decisiones" },
  { name: "Julia Veksler", style: "suspenso urbano y personajes al limite" },
  { name: "Renata Abarca", style: "viajes, horizontes nuevos y corazon inquieto" },
  { name: "Sofia Vergel", style: "recuerdos vivos, cronicas y verdad emocional" },
  { name: "Dario Bell", style: "robots, futuros proximos y preguntas humanas" }
];

function pickProfile(index) {
  return CREATOR_PROFILES[index % CREATOR_PROFILES.length];
}

function compactCategory(category) {
  return slugify(category).replace(/-/g, "");
}

function buildCreatorEmail(category) {
  return `seed.${compactCategory(category)}@valoria.test`;
}

function buildAvatarUrl(seed) {
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(seed)}&backgroundType=gradientLinear`;
}

function buildCoverUrl(seed) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/512/800`;
}

function buildIllustrationCoverUrl(seed) {
  return `https://picsum.photos/seed/${encodeURIComponent(`illustration-${seed}`)}/1024/1365`;
}

function buildStoryTitle(category, creatorName) {
  const titleMap = {
    Romance: "Cartas antes del amanecer",
    Fantasia: "El jardin de las lunas partidas",
    Humor: "Manual para sobrevivir al ridiculo",
    "Ciencia ficcion": "La ciudad despues del brillo",
    Fanfiction: "Entre lineas prestadas",
    "Relato corto": "Doce minutos de verano",
    Paranormal: "La casa que aprendio mi nombre",
    Terror: "Bajo la escalera numero siete",
    Misterio: "La llave de la pieza cerrada",
    "LGBTQ+": "Lo que dijimos en la azotea",
    "Ficcion juvenil": "Trece recreos y un secreto",
    Thriller: "Nadie sale del ultimo tren",
    Aventura: "Mapa para cruzar el viento",
    "Historia real": "Lo que paso despues del incendio"
  };

  return titleMap[category] || `Historia de ${creatorName}`;
}

function buildTagList(category) {
  const tagMap = {
    Romance: ["amor", "secretos", "segunda oportunidad"],
    Fantasia: ["magia", "reinos", "destino"],
    Humor: ["comedia", "caos", "amistad"],
    "Ciencia ficcion": ["futuro", "tecnologia", "distopia"],
    Fanfiction: ["fandom", "universo alterno", "ship"],
    "Relato corto": ["breve", "intenso", "emocion"],
    Paranormal: ["fantasmas", "presencias", "secreto"],
    Terror: ["miedo", "oscuridad", "suspenso"],
    Misterio: ["pistas", "asesinato", "enigma"],
    "LGBTQ+": ["identidad", "descubrimiento", "orgullo"],
    "Ficcion juvenil": ["instituto", "amistad", "primer amor"],
    Thriller: ["peligro", "escape", "conspiracion"],
    Aventura: ["viaje", "mapa", "tesoro"],
    "Historia real": ["memoria", "testimonio", "superacion"]
  };

  return tagMap[category] || ["historia", "serie", "valoria"];
}

function buildIllustrationCategories(category) {
  const map = {
    Romance: ["Romance", "Retrato"],
    Fantasia: ["Fantasia", "Concept art"],
    Humor: ["Humor", "Comic"],
    "Ciencia ficcion": ["Ciencia ficcion", "Concept art"],
    Fanfiction: ["Fanfiction", "Fanart"],
    "Relato corto": ["Relato corto", "Portadas"],
    Paranormal: ["Paranormal", "Fantasia"],
    Terror: ["Terror", "Concept art"],
    Misterio: ["Misterio", "Portadas"],
    "LGBTQ+": ["LGBTQ+", "Retrato"],
    "Ficcion juvenil": ["Ficcion juvenil", "Retrato"],
    Thriller: ["Thriller", "Portadas"],
    Aventura: ["Aventura", "Paisaje"],
    "Historia real": ["Historia real", "Retrato"]
  };

  return map[category] || [category];
}

function buildIllustrationTags(category) {
  const storyTags = buildTagList(category);
  return [...storyTags, "valoria", "ilustracion", "portafolio"];
}

function buildDescription(category, creatorName, tags) {
  return `Una historia de ${category.toLowerCase()} escrita por ${creatorName}, pensada para poblar Valoria con personajes, escenas y conflictos de prueba totalmente ficticios. Temas clave: ${tags.join(", ")}.`;
}

function buildIllustrationTitle(category, creatorName) {
  const titleMap = {
    Romance: "Tu nombre en la lluvia",
    Fantasia: "Guardiana del eclipse violeta",
    Humor: "Caos con cafe a media tarde",
    "Ciencia ficcion": "Neon sobre la ultima orbita",
    Fanfiction: "Version alterna del recuerdo",
    "Relato corto": "Una escena antes del adios",
    Paranormal: "La visitante del espejo opaco",
    Terror: "Silencio en la puerta ocho",
    Misterio: "La foto que no debio existir",
    "LGBTQ+": "Color despues del secreto",
    "Ficcion juvenil": "Pasillo siete al recreo",
    Thriller: "Luces rojas en la autopista",
    Aventura: "Cartografia del viento salvaje",
    "Historia real": "Rostros de una memoria viva"
  };

  return titleMap[category] || `Galeria visual de ${creatorName}`;
}

function buildIllustrationDescription(category, creatorName, tags) {
  return `Pieza visual de ${category.toLowerCase()} creada por ${creatorName} para poblar la vertical de ilustraciones de Valoria. Conceptos clave: ${tags.join(", ")}.`;
}

function buildExcerpt(category, creatorName, tags) {
  return `${creatorName} abre esta historia de ${category.toLowerCase()} con un primer capitulo que deja tono, ritmo y una voz clara para las pruebas del proyecto. Etiquetas visibles: ${tags.map((tag) => `#${slugify(tag)}`).join(" ")}.`;
}

function buildChapterContent(category, creatorName, storyTitle, style, chapterNumber, tags) {
  const chapterStageMap = {
    1: "siembra el tono, presenta a su protagonista y deja una primera grieta en la rutina",
    2: "aprieta el conflicto, muestra una consecuencia real y obliga a tomar una decision",
    3: "eleva la tension, paga la promesa inicial y deja un cierre con ganas de seguir"
  };

  return [
    `Capitulo ${chapterNumber}. ${storyTitle} ${chapterStageMap[chapterNumber]}. ${creatorName} toma una escena sencilla y la empuja hacia algo que poco a poco se vuelve imposible de ignorar. La calle, la habitacion o el paisaje parecen normales, pero el aire ya trae una promesa: algo esta a punto de romper la rutina.`,
    `La narracion se mueve con ${style}. Cada gesto, cada pausa y cada frase buscan dejar una identidad reconocible para la categoria ${category.toLowerCase()}, como si este capitulo quisiera decirle al lector: aqui hay una historia con pulso propio. Palabras clave: ${tags.join(", ")}.`,
    `El personaje principal observa el mundo con una mezcla de deseo y cautela. Quiere acercarse, descubrir, huir o confesar algo, pero todavia no sabe cuanto va a costarle hacerlo. Esa tension inicial le da al texto una base util para revisar tarjetas, perfiles, muros y lecturas dentro de Valoria.`,
    `Antes del cierre, una decision abre el conflicto central. No es una explosion gigantesca: es una puerta que se entreabre, una nota guardada en el bolsillo, una voz al telefono o una sombra al final del pasillo. Lo suficiente para invitar al siguiente capitulo y dejar material util para probar filtros, perfiles y lectura serial.`,
    `Este contenido es ficticio y fue sembrado para pruebas visuales y funcionales de la plataforma. Si estas leyendo esto dentro de Valoria, significa que la conexion con la base de datos, las historias, los capitulos y los perfiles del creador estan funcionando como se espera.`
  ].join("\n\n");
}

async function ensureAuthUser(email, password, displayName, avatarUrl) {
  const { data: usersPage, error: listError } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000
  });

  if (listError) {
    throw new Error(`No se pudo listar usuarios: ${listError.message}`);
  }

  const existingUser = usersPage.users.find(
    (user) => String(user.email || "").toLowerCase() === email.toLowerCase()
  );

  if (existingUser) {
    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      existingUser.id,
      {
        password,
        email_confirm: true,
        user_metadata: {
          display_name: displayName,
          avatar_url: avatarUrl
        }
      }
    );

    if (updateError) {
      throw new Error(`No se pudo actualizar el usuario ${email}: ${updateError.message}`);
    }

    return updatedUser.user;
  }

  const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      display_name: displayName,
      avatar_url: avatarUrl
    }
  });

  if (createError) {
    throw new Error(`No se pudo crear el usuario ${email}: ${createError.message}`);
  }

  return createdUser.user;
}

async function ensureProfile(user, email, displayName, bio, avatarUrl, coverUrl) {
  const payload = {
    id: user.id,
    email,
    display_name: displayName,
    bio,
    avatar_url: avatarUrl,
    cover_url: coverUrl
  };

  const { error } = await supabaseAdmin
    .from("profiles")
    .upsert(payload, { onConflict: "id" });

  if (error) {
    throw new Error(`No se pudo upsertar el perfil ${email}: ${error.message}`);
  }
}

async function ensureProfileRole(profileId, roleType) {
  const { error } = await supabaseAdmin.from("profile_roles").upsert(
    {
      profile_id: profileId,
      role_type: roleType
    },
    { onConflict: "profile_id,role_type" }
  );

  if (error) {
    throw new Error(`No se pudo asegurar el rol ${roleType}: ${error.message}`);
  }
}

async function ensureStory(authorId, authorName, category, coverUrl, index) {
  const title = buildStoryTitle(category, authorName);
  const slug = slugify(`${category}-${title}`);
  const tags = buildTagList(category);
  const description = buildDescription(category, authorName, tags);
  const excerpt = buildExcerpt(category, authorName, tags);
  const readsCount = 60 + index * 17;

  const { data: existing, error: lookupError } = await supabaseAdmin
    .from("stories")
    .select("*")
    .eq("author_id", authorId)
    .eq("slug", slug)
    .maybeSingle();

  if (lookupError) {
    throw new Error(`No se pudo revisar la historia ${title}: ${lookupError.message}`);
  }

  const payload = {
    author_id: authorId,
    title,
    slug,
    description,
    excerpt,
    category,
    author_name: authorName,
    cover_url: coverUrl,
    status: "published",
    is_featured: index < 6,
    reads_count: readsCount,
    rating_average: 0,
    rating_count: 0
  };

  if (existing) {
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("stories")
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single();

    if (updateError) {
      throw new Error(`No se pudo actualizar la historia ${title}: ${updateError.message}`);
    }

    return updated;
  }

  const { data: created, error: createError } = await supabaseAdmin
    .from("stories")
    .insert(payload)
    .select("*")
    .single();

  if (createError) {
    throw new Error(`No se pudo crear la historia ${title}: ${createError.message}`);
  }

  return created;
}

async function ensureIllustrationCategories(categories = []) {
  const normalized = [...new Set(categories.map((category) => String(category || "").trim()).filter(Boolean))];

  if (!normalized.length) {
    return [];
  }

  const slugs = normalized.map((category) => slugify(category));

  const { data: existing, error: lookupError } = await supabaseAdmin
    .from("illustration_categories")
    .select("id, name, slug")
    .in("slug", slugs);

  if (lookupError) {
    throw new Error(`No se pudieron revisar categorias de ilustracion: ${lookupError.message}`);
  }

  const existingBySlug = new Map((existing || []).map((row) => [row.slug, row]));
  const missing = normalized
    .map((category) => ({ name: category, slug: slugify(category) }))
    .filter((row) => !existingBySlug.has(row.slug));

  if (missing.length) {
    const { data: created, error: createError } = await supabaseAdmin
      .from("illustration_categories")
      .insert(missing)
      .select("id, name, slug");

    if (createError) {
      throw new Error(`No se pudieron crear categorias de ilustracion: ${createError.message}`);
    }

    for (const row of created || []) {
      existingBySlug.set(row.slug, row);
    }
  }

  return slugs.map((slug) => existingBySlug.get(slug)?.id).filter(Boolean);
}

async function ensureIllustrationTags(tags = []) {
  const normalized = [...new Set(tags.map((tag) => String(tag || "").trim()).filter(Boolean))];

  if (!normalized.length) {
    return [];
  }

  const slugs = normalized.map((tag) => slugify(tag));

  const { data: existing, error: lookupError } = await supabaseAdmin
    .from("illustration_tags")
    .select("id, name, slug")
    .in("slug", slugs);

  if (lookupError) {
    throw new Error(`No se pudieron revisar tags de ilustracion: ${lookupError.message}`);
  }

  const existingBySlug = new Map((existing || []).map((row) => [row.slug, row]));
  const missing = normalized
    .map((tag) => ({ name: tag, slug: slugify(tag) }))
    .filter((row) => !existingBySlug.has(row.slug));

  if (missing.length) {
    const { data: created, error: createError } = await supabaseAdmin
      .from("illustration_tags")
      .insert(missing)
      .select("id, name, slug");

    if (createError) {
      throw new Error(`No se pudieron crear tags de ilustracion: ${createError.message}`);
    }

    for (const row of created || []) {
      existingBySlug.set(row.slug, row);
    }
  }

  return slugs.map((slug) => existingBySlug.get(slug)?.id).filter(Boolean);
}

async function replaceIllustrationLinks(tableName, keyName, illustrationId, ids) {
  const { error: deleteError } = await supabaseAdmin
    .from(tableName)
    .delete()
    .eq("illustration_post_id", illustrationId);

  if (deleteError) {
    throw new Error(`No se pudo limpiar ${tableName}: ${deleteError.message}`);
  }

  if (!ids.length) {
    return;
  }

  const payload = ids.map((id) => ({
    illustration_post_id: illustrationId,
    [keyName]: id
  }));

  const { error: insertError } = await supabaseAdmin.from(tableName).insert(payload);

  if (insertError) {
    throw new Error(`No se pudo poblar ${tableName}: ${insertError.message}`);
  }
}

async function ensureIllustrationImages(illustrationId, images = []) {
  const { error: deleteError } = await supabaseAdmin
    .from("illustration_images")
    .delete()
    .eq("illustration_post_id", illustrationId);

  if (deleteError) {
    throw new Error(`No se pudieron limpiar imagenes de ilustracion: ${deleteError.message}`);
  }

  if (!images.length) {
    return;
  }

  const payload = images.map((image, index) => ({
    illustration_post_id: illustrationId,
    storage_path: image.storagePath || "",
    public_url: image.publicUrl,
    alt_text: image.altText || "",
    sort_order: index
  }));

  const { error: insertError } = await supabaseAdmin
    .from("illustration_images")
    .insert(payload);

  if (insertError) {
    throw new Error(`No se pudieron guardar imagenes de ilustracion: ${insertError.message}`);
  }
}

async function ensureIllustration(authorId, authorName, category, index) {
  const title = buildIllustrationTitle(category, authorName);
  const slug = slugify(`${category}-${title}`);
  const coverUrl = buildIllustrationCoverUrl(`${category}-${authorName}`);
  const categories = buildIllustrationCategories(category);
  const tags = buildIllustrationTags(category);
  const description = buildIllustrationDescription(category, authorName, tags);

  const images = Array.from({ length: ILLUSTRATION_COUNT }, (_, imageIndex) => ({
    publicUrl: `${coverUrl}?variant=${imageIndex + 1}`,
    altText: `${title} - variante ${imageIndex + 1}`
  }));

  const { data: existing, error: lookupError } = await supabaseAdmin
    .from("illustration_posts")
    .select("*")
    .eq("author_id", authorId)
    .eq("slug", slug)
    .maybeSingle();

  if (lookupError) {
    throw new Error(`No se pudo revisar la ilustracion ${title}: ${lookupError.message}`);
  }

  const payload = {
    author_id: authorId,
    title,
    slug,
    description,
    cover_url: coverUrl,
    status: "published",
    visibility: "public",
    is_featured: index < 6,
    views_count: 90 + index * 21,
    likes_count: 12 + index * 3,
    comments_count: 0
  };

  let illustrationId = existing?.id;

  if (existing) {
    const { error: updateError } = await supabaseAdmin
      .from("illustration_posts")
      .update(payload)
      .eq("id", existing.id);

    if (updateError) {
      throw new Error(`No se pudo actualizar la ilustracion ${title}: ${updateError.message}`);
    }
  } else {
    const { data: created, error: createError } = await supabaseAdmin
      .from("illustration_posts")
      .insert(payload)
      .select("id")
      .single();

    if (createError) {
      throw new Error(`No se pudo crear la ilustracion ${title}: ${createError.message}`);
    }

    illustrationId = created.id;
  }

  const categoryIds = await ensureIllustrationCategories(categories);
  const tagIds = await ensureIllustrationTags(tags);

  await replaceIllustrationLinks(
    "illustration_post_categories",
    "category_id",
    illustrationId,
    categoryIds
  );
  await replaceIllustrationLinks(
    "illustration_post_tags",
    "tag_id",
    illustrationId,
    tagIds
  );
  await ensureIllustrationImages(illustrationId, images);

  return {
    id: illustrationId,
    title,
    coverUrl,
    categories,
    tags
  };
}

function buildChapterTitle(storyTitle, chapterNumber) {
  const titleMap = {
    1: "La primera grieta",
    2: "Lo que nadie dijo",
    3: "La puerta entreabierta"
  };

  return `Capitulo ${chapterNumber}: ${titleMap[chapterNumber] || storyTitle}`;
}

async function ensureChapter(story, category, authorName, style, chapterNumber, tags) {
  const title = buildChapterTitle(story.title, chapterNumber);
  const slug = slugify(`${story.slug}-capitulo-${chapterNumber}`);
  const content = buildChapterContent(
    category,
    authorName,
    story.title,
    style,
    chapterNumber,
    tags
  );

  const { data: existing, error: lookupError } = await supabaseAdmin
    .from("chapters")
    .select("*")
    .eq("story_id", story.id)
    .eq("chapter_number", chapterNumber)
    .maybeSingle();

  if (lookupError) {
    throw new Error(`No se pudo revisar el capitulo de ${story.title}: ${lookupError.message}`);
  }

  const payload = {
    story_id: story.id,
    title,
    slug,
    chapter_number: chapterNumber,
    excerpt: `Capitulo ${chapterNumber} de prueba para ${story.title}, con foco en ${tags[chapterNumber - 1] || tags[0]}.`,
    content,
    status: "published",
    published_at: existing?.published_at || new Date().toISOString()
  };

  if (existing) {
    const { error: updateError } = await supabaseAdmin
      .from("chapters")
      .update(payload)
      .eq("id", existing.id);

    if (updateError) {
      throw new Error(`No se pudo actualizar el capitulo de ${story.title}: ${updateError.message}`);
    }

    return;
  }

  const { error: createError } = await supabaseAdmin.from("chapters").insert(payload);

  if (createError) {
    throw new Error(`No se pudo crear el capitulo de ${story.title}: ${createError.message}`);
  }
}

async function ensureWallPost(creatorId, authorId, authorName, category, storyTitle, tags) {
  const content = [
    `Hola, soy ${authorName} y este es mi primer estado en Valoria.`,
    `Estoy publicando "${storyTitle}", una historia de ${category.toLowerCase()} que gira alrededor de ${tags.join(", ")}.`,
    "Este mensaje forma parte del seed de prueba para que el Muro de creador ya aparezca vivo desde la primera visita."
  ].join("\n\n");

  const { data: existing, error: lookupError } = await supabaseAdmin
    .from("creator_wall_posts")
    .select("*")
    .eq("creator_id", creatorId)
    .eq("author_id", authorId)
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    throw new Error(`No se pudo revisar el muro de ${authorName}: ${lookupError.message}`);
  }

  if (existing) {
    const { error: updateError } = await supabaseAdmin
      .from("creator_wall_posts")
      .update({
        content,
        updated_at: new Date().toISOString()
      })
      .eq("id", existing.id);

    if (updateError) {
      throw new Error(`No se pudo actualizar el muro de ${authorName}: ${updateError.message}`);
    }

    return;
  }

  const { error: createError } = await supabaseAdmin.from("creator_wall_posts").insert({
    creator_id: creatorId,
    author_id: authorId,
    author_name: authorName,
    content
  });

  if (createError) {
    throw new Error(`No se pudo crear el muro de ${authorName}: ${createError.message}`);
  }
}

async function getPrimaryWallPost(creatorId) {
  const { data, error } = await supabaseAdmin
    .from("creator_wall_posts")
    .select("*")
    .eq("creator_id", creatorId)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (error) {
    throw new Error(`No se pudo recuperar el muro principal: ${error.message}`);
  }

  return data;
}

async function ensureFollowRelationship(followerId, followedId) {
  if (followerId === followedId) {
    return;
  }

  const { error } = await supabaseAdmin.from("profile_follows").upsert(
    {
      follower_id: followerId,
      followed_id: followedId
    },
    { onConflict: "followed_id,follower_id" }
  );

  if (error) {
    throw new Error(`No se pudo crear seguimiento: ${error.message}`);
  }
}

async function ensureWallComment({
  creatorId,
  postId,
  authorId,
  authorName,
  parentCommentId = null,
  content
}) {
  const { data: existing, error: lookupError } = await supabaseAdmin
    .from("creator_wall_comments")
    .select("*")
    .eq("creator_id", creatorId)
    .eq("post_id", postId)
    .eq("author_id", authorId)
    .eq("content", content)
    .maybeSingle();

  if (lookupError) {
    throw new Error(`No se pudo revisar comentario del muro: ${lookupError.message}`);
  }

  if (existing) {
    return existing;
  }

  const { data, error } = await supabaseAdmin
    .from("creator_wall_comments")
    .insert({
      creator_id: creatorId,
      post_id: postId,
      author_id: authorId,
      author_name: authorName,
      parent_comment_id: parentCommentId,
      content,
      likes_count: 0
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`No se pudo crear comentario del muro: ${error.message}`);
  }

  return data;
}

async function ensureWallLike(commentId, userId) {
  const { data: existing, error: lookupError } = await supabaseAdmin
    .from("creator_wall_comment_likes")
    .select("id")
    .eq("comment_id", commentId)
    .eq("user_id", userId)
    .maybeSingle();

  if (lookupError) {
    throw new Error(`No se pudo revisar like del muro: ${lookupError.message}`);
  }

  if (!existing) {
    const { error: insertError } = await supabaseAdmin
      .from("creator_wall_comment_likes")
      .insert({
        comment_id: commentId,
        user_id: userId
      });

    if (insertError) {
      throw new Error(`No se pudo crear like del muro: ${insertError.message}`);
    }
  }

  const { data: comment, error: commentError } = await supabaseAdmin
    .from("creator_wall_comments")
    .select("likes_count")
    .eq("id", commentId)
    .single();

  if (commentError) {
    throw new Error(`No se pudo leer contador de likes: ${commentError.message}`);
  }

  const nextLikes = Math.max(1, Number(comment.likes_count || 0));
  const { error: updateError } = await supabaseAdmin
    .from("creator_wall_comments")
    .update({ likes_count: nextLikes })
    .eq("id", commentId);

  if (updateError) {
    throw new Error(`No se pudo actualizar likes del comentario: ${updateError.message}`);
  }
}

async function seedCategory(category, index) {
  const creator = pickProfile(index);
  const displayName = `${creator.name}`;
  const email = buildCreatorEmail(category);
  const avatarUrl = buildAvatarUrl(`${category}-${displayName}`);
  const coverUrl = buildCoverUrl(`${category}-${displayName}`);
  const bio = `${displayName} escribe ${category.toLowerCase()} en Valoria con un tono de ${creator.style}.`;
  const tags = buildTagList(category);

  const user = await ensureAuthUser(email, DEFAULT_PASSWORD, displayName, avatarUrl);
  await ensureProfile(user, email, displayName, bio, avatarUrl, coverUrl);
  await ensureProfileRole(user.id, "writer");
  await ensureProfileRole(user.id, "illustrator");

  const story = await ensureStory(user.id, displayName, category, coverUrl, index);
  const illustration = await ensureIllustration(user.id, displayName, category, index);
  for (let chapterNumber = 1; chapterNumber <= CHAPTER_COUNT; chapterNumber += 1) {
    await ensureChapter(
      story,
      category,
      displayName,
      creator.style,
      chapterNumber,
      tags
    );
  }
  await ensureWallPost(user.id, user.id, displayName, category, story.title, tags);

  return {
    category,
    email,
    password: DEFAULT_PASSWORD,
    displayName,
    storyTitle: story.title,
    illustrationTitle: illustration.title,
    tags: tags.join(", "),
    userId: user.id
  };
}

async function seedCommunityInteractions(results) {
  for (let index = 0; index < results.length; index += 1) {
    const creator = results[index];
    const followerA = results[(index + 1) % results.length];
    const followerB = results[(index + 2) % results.length];
    const followerC = results[(index + 3) % results.length];

    await ensureFollowRelationship(followerA.userId, creator.userId);
    await ensureFollowRelationship(followerB.userId, creator.userId);

    const wallPost = await getPrimaryWallPost(creator.userId);

    const firstComment = await ensureWallComment({
      creatorId: creator.userId,
      postId: wallPost.id,
      authorId: followerA.userId,
      authorName: followerA.displayName,
      content: `Me atrapo la premisa de "${creator.storyTitle}". ${creator.tags.split(", ")[0]} y ${creator.tags.split(", ")[1]} suenan como una combinacion muy fuerte.`
    });

    const replyComment = await ensureWallComment({
      creatorId: creator.userId,
      postId: wallPost.id,
      authorId: followerB.userId,
      authorName: followerB.displayName,
      parentCommentId: firstComment.id,
      content: `Yo tambien lo pense. Ademas, ${creator.displayName} ya tiene tres capitulos arriba y se nota el tono desde el primero.`
    });

    await ensureWallLike(firstComment.id, followerC.userId);
    await ensureWallLike(replyComment.id, creator.userId);
  }
}

async function main() {
  if (!isSupabaseEnabled()) {
    throw new Error("Supabase no esta habilitado. Revisa server/.env antes de ejecutar el seed.");
  }

  const results = [];

  for (const [index, category] of ALL_CATEGORIES.entries()) {
    const seeded = await seedCategory(category, index);
    results.push(seeded);
  }

  await seedCommunityInteractions(results);

  console.log("Seed completado.");
  console.table(
    results.map((item) => ({
      categoria: item.category,
      usuario: item.displayName,
      email: item.email,
      password: item.password,
      historia: item.storyTitle,
      ilustracion: item.illustrationTitle,
      etiquetas: item.tags
    }))
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
