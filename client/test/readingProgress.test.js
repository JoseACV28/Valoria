import assert from "node:assert/strict";
import test from "node:test";
import { readChapterIndex, saveReadingProgress } from "../src/utils/readingProgress.js";
import { normalizeStoryForReading } from "../src/utils/storyMocks.js";

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) || null,
    setItem: (key, value) => data.set(key, value)
  };
}

test("restaura el capitulo por ID incluso cuando cambia el orden", () => {
  const storage = memoryStorage();
  saveReadingProgress("story", "reader", "second", storage);
  assert.equal(readChapterIndex("story", "reader", [{ id: "first" }, { id: "second" }], storage), 1);
  assert.equal(readChapterIndex("story", "reader", [{ id: "second" }, { id: "first" }], storage), 0);
});

test("separa el avance entre lectores, invitados e historias", () => {
  const storage = memoryStorage();
  const chapters = [{ id: "first" }, { id: "second" }];
  saveReadingProgress("story", "reader", "second", storage);
  assert.equal(readChapterIndex("story", "another-reader", chapters, storage), 0);
  assert.equal(readChapterIndex("story", null, chapters, storage), 0);
  assert.equal(readChapterIndex("other-story", "reader", chapters, storage), 0);
});

test("vuelve al primer capitulo si el guardado fue eliminado o despublicado", () => {
  const storage = memoryStorage();
  saveReadingProgress("story", "reader", "second", storage);
  assert.equal(readChapterIndex("story", "reader", [{ id: "first" }], storage), 0);
  assert.equal(readChapterIndex("story", "reader", [], storage), 0);
});

test("tolera almacenamiento bloqueado y datos corruptos", () => {
  const blocked = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
  assert.equal(readChapterIndex("story", "reader", [], blocked), 0);
  assert.doesNotThrow(() => saveReadingProgress("story", "reader", "chapter", blocked));
  const storage = memoryStorage();
  storage.setItem("valoria-reading-progress:reader", "invalid-json");
  saveReadingProgress("story", "reader", "second", storage);
  assert.equal(readChapterIndex("story", "reader", [{ id: "first" }, { id: "second" }], storage), 1);
});

test("limita el historial local a cien historias", () => {
  const storage = memoryStorage();
  for (let index = 0; index < 120; index += 1) saveReadingProgress(`story-${index}`, "reader", "chapter", storage);
  assert.equal(Object.keys(JSON.parse(storage.getItem("valoria-reading-progress:reader"))).length, 100);
});

test("una historia sin reseñas conserva puntuacion y contador en cero", () => {
  const story = normalizeStoryForReading({ id: "story", ratingAverage: 0, ratingCount: 0 });
  assert.equal(story.ratingAverage, 0);
  assert.equal(story.ratingCount, 0);
});
