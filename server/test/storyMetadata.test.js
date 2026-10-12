import assert from "node:assert/strict";
import test from "node:test";
import { StoryModel } from "../src/models/storyModel.js";

test("personajes y etiquetas sobreviven a creación, lectura y actualización", async () => {
  const story = await StoryModel.create({ title: "Prueba de metadatos", description: "Prueba local", category: "Fantasia", authorName: "Escritor", authorId: "demo", status: "published", characters: [" Emilia ", "Emilia"], tags: ["amistad"] });
  assert.deepEqual(story.characters, ["Emilia"]);
  assert.deepEqual((await StoryModel.getByIdOrSlug(story.id)).tags, ["amistad"]);
  const changed = await StoryModel.update(story.id, { characters: ["Tomás"], tags: [] });
  assert.deepEqual(changed.characters, ["Tomás"]);
  assert.deepEqual(changed.tags, []);
  await StoryModel.delete(story.id);
});
