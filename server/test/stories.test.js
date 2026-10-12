import assert from "node:assert/strict";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

// Estas pruebas nunca usan las credenciales ni los datos del proyecto Supabase.
process.env.SUPABASE_URL = "";
process.env.SUPABASE_ANON_KEY = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.UPLOAD_FALLBACK_DIR = `uploads/test-${randomUUID()}`;
const { default: app } = await import("../src/app.js");
const { env } = await import("../src/config/env.js");

test("flujo editorial y aislamiento de borradores", async (t) => {
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    const uploadsRoot = fileURLToPath(new URL("../uploads/", import.meta.url));
    const relative = path.relative(uploadsRoot, env.uploadAbsoluteDir);
    assert.ok(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
    await rm(env.uploadAbsoluteDir, { recursive: true, force: true });
  });

  async function request(route, { method = "GET", token = "", body } = {}) {
    const response = await fetch(`${baseUrl}/api${route}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { "Content-Type": "application/json" } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
    return { status: response.status, data: response.status === 204 ? null : await response.json() };
  }
  const register = async (name) => {
    const response = await request("/auth/register", { method: "POST", body: {
      email: `${name}@test.invalid`, password: "test-password-strong", displayName: name
    } });
    assert.equal(response.status, 201);
    return response.data.accessToken;
  };
  const owner = await register("owner");
  const visitor = await register("visitor");

  await t.test("ilustraciones privadas y borradores requieren al autor; unlisted permite enlaces directos", async () => {
    const { IllustrationModel } = await import("../src/models/illustrationModel.js");
    const ownerId = (await request("/auth/me", { token: owner })).data.user.id;
    const originalLookup = IllustrationModel.getByIdOrSlug;
    try {
      for (const content of [
        { status: "draft", visibility: "public" },
        { status: "published", visibility: "private" }
      ]) {
        IllustrationModel.getByIdOrSlug = async () => ({ id: "piece", authorId: ownerId, ...content });
        for (const token of ["", visitor]) {
          assert.equal((await request("/illustrations/piece", { token })).status, 404);
          assert.equal((await request("/illustrations/piece/comments", { token })).status, 404);
          assert.equal((await request("/illustrations/piece/fanarts", { token })).status, 404);
        }
        assert.equal((await request("/illustrations/piece", { token: owner })).status, 200);
        assert.equal((await request("/illustrations/piece/like", { method: "POST", token: visitor })).status, 404);
        assert.equal((await request("/illustrations/piece/comments/comment/like", { method: "POST", token: visitor })).status, 404);
        assert.equal((await request("/illustrations/piece/comments", { method: "POST", token: visitor,
          body: { content: "Comentario" } })).status, 404);
        assert.equal((await request("/illustrations/piece/fanarts", { method: "POST", token: visitor,
          body: { publicUrl: "https://example.invalid/test.png" } })).status, 404);
      }
      IllustrationModel.getByIdOrSlug = async () => ({ id: "piece", authorId: ownerId,
        status: "published", visibility: "unlisted" });
      assert.equal((await request("/illustrations/piece")).status, 200);
    } finally {
      IllustrationModel.getByIdOrSlug = originalLookup;
    }
  });
  const storyInput = { title: "Historia de prueba", description: "Una historia", category: "Fantasia" };
  const created = await request("/stories", { method: "POST", token: owner, body: storyInput });
  assert.equal(created.status, 201);
  const storyId = created.data.story.id;
  const chapterRoute = `/stories/${storyId}/chapters`;

  await t.test("solo el autor puede abrir un borrador por ID o slug", async () => {
    for (const identifier of [storyId, created.data.story.slug]) {
      assert.equal((await request(`/stories/${identifier}`)).status, 404);
      assert.equal((await request(`/stories/${identifier}`, { token: visitor })).status, 404);
      assert.equal((await request(`/stories/${identifier}`, { token: owner })).status, 200);
    }
    assert.equal((await request(chapterRoute)).status, 404);
    assert.equal((await request(`/stories/${storyId}/read`, { method: "POST" })).status, 404);
    const preview = await request(`/stories/${storyId}/read`, { method: "POST", token: owner });
    assert.equal(preview.data.story.reads_count, 0);
    const list = await request("/stories");
    assert.ok(!list.data.stories.some((story) => story.id === storyId));
  });

  let draft;
  await t.test("valida capitulos y restringe modificaciones a su autor", async () => {
    for (const chapterNumber of [0, -1, 1.5, "no-numero"]) {
      assert.equal((await request(chapterRoute, { method: "POST", token: owner,
        body: { title: "Capitulo", chapterNumber } })).status, 400);
    }
    assert.equal((await request(chapterRoute, { method: "POST", token: visitor,
      body: { title: "Capitulo", chapterNumber: 1 } })).status, 403);
    assert.equal((await request(chapterRoute, { method: "POST", token: owner,
      body: { title: "Capitulo", chapterNumber: 1, status: "invalid" } })).status, 400);
    const result = await request(chapterRoute, { method: "POST", token: owner,
      body: { title: "Capitulo reservado", chapterNumber: 1, content: "Texto privado" } });
    assert.equal(result.status, 201);
    draft = result.data.chapter;
    const duplicate = await request(chapterRoute, { method: "POST", token: owner,
      body: { title: "Otro titulo", chapterNumber: 1 } });
    assert.equal(duplicate.status, 409);
    const duplicateTitle = await request(chapterRoute, { method: "POST", token: owner,
      body: { title: draft.title, chapterNumber: 2 } });
    assert.equal(duplicateTitle.status, 409);
  });

  let published;
  await t.test("publicar un capitulo publica la historia, preservando los otros borradores", async () => {
    const result = await request(chapterRoute, { method: "POST", token: owner,
      body: { title: "Capitulo publico", chapterNumber: 2, content: "Texto publico", status: "published" } });
    assert.equal(result.status, 201);
    published = result.data.chapter;
    assert.equal(result.data.story.status, "published");
    const publicChapters = await request(chapterRoute);
    assert.deepEqual(publicChapters.data.chapters.map((chapter) => chapter.id), [published.id]);
    assert.equal((await request(chapterRoute, { token: visitor })).data.chapters.length, 1);
    assert.equal((await request(chapterRoute, { token: owner })).data.chapters.length, 2);
    assert.equal((await request(`${chapterRoute}/${published.id}`, { method: "PUT", token: visitor,
      body: { title: published.title, chapterNumber: 2 } })).status, 403);
    assert.equal((await request(`${chapterRoute}/${published.id}`, { method: "PUT", token: owner,
      body: { title: published.title, chapterNumber: 1 } })).status, 409);
    const read = await request(`/stories/${storyId}/read`, { method: "POST" });
    assert.equal(read.data.story.reads_count, 1);
    assert.equal((await request(`/stories/${storyId}`)).data.story.ratingAverage, 0);
  });

  await t.test("las imagenes de capitulos sobreviven a una nueva consulta", async () => {
    const image = { publicUrl: "https://example.invalid/image.png", storagePath: "test/image.png" };
    assert.equal((await request(`${chapterRoute}/missing/illustrations`, {
      method: "POST", token: owner, body: image })).status, 404);
    assert.equal((await request(`${chapterRoute}/${published.id}/illustrations`, {
      method: "POST", token: owner, body: image })).status, 201);
    const chapters = await request(chapterRoute);
    assert.equal(chapters.data.chapters[0].chapter_images[0].public_url, image.publicUrl);
    assert.equal((await request(`${chapterRoute}/${published.id}/illustrations`, {
      method: "POST", token: visitor, body: { ...image, imageRole: "creator" } })).status, 403);
    assert.equal((await request(`${chapterRoute}/${draft.id}/illustrations`, {
      method: "POST", token: visitor, body: { ...image, imageRole: "community" } })).status, 404);
    const community = await request(`${chapterRoute}/${published.id}/illustrations`, {
      method: "POST", token: visitor, body: { ...image, imageRole: "community", contributorName: "Nombre suplantado" } });
    assert.equal(community.status, 201);
    assert.equal(community.data.illustration.image_role, "community");
    assert.equal(community.data.illustration.contributor_name, "visitor");
  });

  await t.test("las reseñas respetan el capitulo y la historia de origen", async () => {
    const reviewRoute = `/stories/${storyId}/reviews`;
    const reviewBody = { rating: 5, reviewText: "Buen capitulo", chapterId: draft.id };
    assert.equal((await request(reviewRoute, { method: "POST", token: visitor, body: reviewBody })).status, 404);
    assert.equal((await request(reviewRoute, { method: "POST", token: owner,
      body: { ...reviewBody, rating: "abc" } })).status, 400);
    const privateReview = await request(reviewRoute, { method: "POST", token: owner, body: reviewBody });
    assert.equal(privateReview.status, 201);
    assert.equal((await request(`${reviewRoute}?chapterId=${draft.id}`)).status, 404);
    assert.equal((await request(reviewRoute)).data.reviews.length, 0);
    const publicReview = await request(reviewRoute, { method: "POST", token: visitor,
      body: { ...reviewBody, chapterId: published.id } });
    assert.equal(publicReview.status, 201);
    const reviewId = publicReview.data.review.id;
    const reply = await request(`${reviewRoute}/${reviewId}/reply`, { method: "POST", token: owner,
      body: { reviewText: "Gracias", chapterId: draft.id } });
    assert.equal(reply.status, 201);
    assert.equal(reply.data.review.chapter_id, published.id);
    const otherStory = await request("/stories", { method: "POST", token: owner,
      body: { ...storyInput, title: "Segunda historia", status: "published" } });
    const otherRoute = `/stories/${otherStory.data.story.id}/reviews/${reviewId}`;
    assert.equal((await request(`${otherRoute}/like`, { method: "POST", token: visitor })).status, 404);
    assert.equal((await request(`${otherRoute}/reply`, { method: "POST", token: visitor,
      body: { reviewText: "Respuesta fuera de contexto" } })).status, 404);
  });

  await t.test("los likes concurrentes se registran una vez por cuenta y sobreviven a la consulta", async () => {
    const route=`/stories/${storyId}/reviews`;
    const review=(await request(route,{method:'POST',token:visitor,body:{rating:5,reviewText:'Reseña para comprobar reacciones'}})).data.review;
    const likeRoute=`${route}/${review.id}/like`;
    assert.equal((await request(likeRoute,{method:'POST'})).status,401);
    const responses=await Promise.all(Array.from({length:8},()=>request(likeRoute,{method:'POST',token:owner})));
    assert.ok(responses.every(result=>result.status===200));
    assert.equal(responses.filter(result=>!result.data.alreadyLiked).length,1);
    const another=await register('another-reader');
    const otherLike=await request(likeRoute,{method:'POST',token:another});assert.equal(otherLike.data.review.likesCount,2);
    const reloaded=(await request(route,{token:owner})).data.reviews.find(item=>item.id===review.id);
    assert.equal(reloaded.likesCount,2);assert.equal(reloaded.likedByCurrentUser,true);
  });

  await t.test("los uploads locales se sirven desde la carpeta del servidor", async () => {
    const form = new FormData();
    const image = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADUlEQVQImWP4////fwAJ+wP9CNHoHgAAAABJRU5ErkJggg==", "base64");
    form.append("image", new Blob([image], { type: "image/png" }), "pixel.png");
    const response = await fetch(`${baseUrl}/api/uploads/chapter-image`, {
      method: "POST", headers: { Authorization: `Bearer ${owner}` }, body: form
    });
    assert.equal(response.status, 201);
    const uploaded = await response.json();
    const download = await fetch(uploaded.file.publicUrl);
    assert.equal(download.status, 200);
    assert.deepEqual(Buffer.from(await download.arrayBuffer()), image);
  });

  await t.test("mover una historia a la papelera la retira de lectura", async () => {
    assert.equal((await request(`/stories/${storyId}`, { method: "DELETE", token: visitor })).status, 403);
    assert.equal((await request(`/stories/${storyId}`, { method: "DELETE", token: owner })).status, 204);
    assert.equal((await request(chapterRoute, { token: owner })).status, 404);
    assert.equal((await request(`/stories/${storyId}/reviews`, { token: owner })).status, 404);
  });
});
