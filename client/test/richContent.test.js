import assert from "node:assert/strict";
import test from "node:test";
import { contentToHtml, escapeHtml, isRichContent, RICH_CONTENT_PREFIX, safeLink } from "../src/utils/richContent.js";

test("los capitulos antiguos se muestran como texto literal, incluso si contienen HTML", () => {
  const content = contentToHtml('Primera linea\n<script>alert("x")</script>');
  assert.ok(content.includes("<p>Primera linea</p>"));
  assert.ok(content.includes("&lt;script&gt;"));
  assert.ok(!content.includes("<script>"));
});

test("rechaza enlaces ejecutables y acepta protocolos de enlaces de lectura", () => {
  for (const value of ['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'file:///C:/secret', '/relative']) assert.equal(safeLink(value), "");
  assert.equal(safeLink("https://example.com/read"), "https://example.com/read");
  assert.equal(safeLink("mailto:reader@example.com"), "mailto:reader@example.com");
});

test("el formato enriquecido tiene un marcador explicito y el codigo se escapa", () => {
  assert.equal(isRichContent("<b>Texto antiguo</b>"), false);
  assert.equal(isRichContent(RICH_CONTENT_PREFIX + "<b>Texto nuevo</b>"), true);
  assert.equal(escapeHtml('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
});
