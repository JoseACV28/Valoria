import assert from "node:assert/strict";
import test from "node:test";
import { creatorsFromWorks, matchesWork, searchLink } from "../src/utils/search.js";

const story = { title: "Órbita", author: "José", authorId: "a", category: "Fantasía", characters: ["Emilia", "Tomás"], tags: ["amistad", "mar & sol"] };
test("la búsqueda encuentra títulos, autores, personajes y etiquetas sin depender de tildes", () => {
  for (const query of ["orbita", "JOSE", "tomas", "amistad", "orbita amistad"]) assert.equal(matchesWork(story, query), true);
  assert.equal(matchesWork(story, "orbita terror"), false);
  assert.equal(matchesWork(story, "", "", "Romance"), false);
});
test("los enlaces de personaje y etiqueta buscan su campo exacto y codifican caracteres especiales", () => {
  assert.equal(matchesWork(story, "emilia", "character"), true);
  assert.equal(matchesWork(story, "emi", "character"), false);
  assert.equal(matchesWork(story, "Emilia", "tag"), false);
  const params = new URLSearchParams(searchLink("mar & sol", "tag").split("?")[1]);
  assert.equal(params.get("q"), "mar & sol");
  assert.equal(params.get("type"), "stories");
  assert.equal(params.get("field"), "tag");
});
test("los creadores se agrupan por identidad y solo se filtran por su nombre", () => {
  assert.deepEqual(creatorsFromWorks([story, { ...story, title: "Dos" }], "jose").map((item) => [item.id, item.count]), [["a", 2]]);
  assert.equal(creatorsFromWorks([story], "amistad").length, 0);
  assert.equal(creatorsFromWorks([{ author: "Sin perfil" }]).length, 0);
});
