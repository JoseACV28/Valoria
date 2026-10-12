// Formato versionado: los capitulos anteriores siguen siendo texto literal.
import DOMPurify from 'dompurify';
export const RICH_CONTENT_PREFIX = "<!--valoria-rich-v1-->";
export const isRichContent = (value = "") => value.startsWith(RICH_CONTENT_PREFIX);
export const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (character) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

export function safeLink(value = "") {
  try {
    const url = new URL(value.trim());
    return ["https:", "http:", "mailto:"].includes(url.protocol) ? url.href : "";
  } catch { return ""; }
}

const allowedTags = new Set(["P", "DIV", "BR", "STRONG", "B", "EM", "I", "U", "S", "STRIKE",
  "H2", "H3", "H4", "UL", "OL", "LI", "BLOCKQUOTE", "PRE", "CODE", "HR", "A", "SPAN", "FONT"]);
const discardTags = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "SVG", "MATH", "TEMPLATE"]);
const fontSizes = ["", "12px", "14px", "16px", "18px", "24px", "30px", "36px"];

export function sanitizeHtml(html = "") {
  const source = document.createElement("template");
  source.innerHTML = html;
  const result = document.createElement("div");
  function copy(node, parent) {
    if (node.nodeType === Node.TEXT_NODE) { parent.append(document.createTextNode(node.textContent)); return; }
    if (node.nodeType !== Node.ELEMENT_NODE || discardTags.has(node.tagName)) return;
    if (!allowedTags.has(node.tagName)) { [...node.childNodes].forEach((child) => copy(child, parent)); return; }
    // El navegador puede envolver un pegado completo en el bloque de codigo activo.
    // Conserva los bloques del documento y limita el estilo de codigo a su propio PRE.
    const tag = node.tagName === "PRE" && node.querySelector("p,div,h2,h3,h4,ul,ol,blockquote,pre,hr")
      ? "div" : node.tagName === "FONT" ? "span" : node.tagName.toLowerCase();
    const element = document.createElement(tag);
    const style = node.style;
    if (["left", "center", "right", "justify"].includes(style.textAlign)) element.style.textAlign = style.textAlign;
    if (style.color && CSS.supports("color", style.color)) element.style.color = style.color;
    const family = style.fontFamily || node.getAttribute("face");
    if (family && /^(Arial|Georgia|Verdana|monospace|sans-serif|serif)$/i.test(family.replace(/["']/g, ""))) {
      element.style.fontFamily = family;
    }
    const size = style.fontSize || fontSizes[Number(node.getAttribute("size"))];
    if (size && /^\d+(\.\d+)?(px|em|rem)$/.test(size) && parseFloat(size) <= 48) element.style.fontSize = size;
    if (node.tagName === "FONT" && node.getAttribute("color") && CSS.supports("color", node.getAttribute("color"))) {
      element.style.color = node.getAttribute("color");
    }
    if (node.tagName === "A") {
      const href = safeLink(node.getAttribute("href") || "");
      if (href) { element.href = href; element.target = "_blank"; element.rel = "noopener noreferrer"; }
    }
    [...node.childNodes].forEach((child) => copy(child, element));
    parent.append(element);
  }
  [...source.content.childNodes].forEach((node) => copy(node, result));
  // Apply the maintained sanitizer last, after the editorial formatting pass.
  return DOMPurify.sanitize(result.innerHTML, {
    ALLOWED_TAGS: [...allowedTags].map(tag => tag.toLowerCase()),
    ALLOWED_ATTR: ['href', 'target', 'rel', 'style'],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false
  });
}

export function contentToHtml(value = "") {
  if (isRichContent(value)) return sanitizeHtml(value.slice(RICH_CONTENT_PREFIX.length));
  return value.split("\n").filter(Boolean).map((line) => `<p>${escapeHtml(line)}</p>`).join("");
}

export function serializeRichContent(html) {
  const safe = sanitizeHtml(html);
  const element = document.createElement("div");
  element.innerHTML = safe;
  return element.textContent.trim() || element.querySelector("hr") ? RICH_CONTENT_PREFIX + safe : "";
}

export function contentBlocks(value = "") {
  const element = document.createElement("div");
  element.innerHTML = contentToHtml(value);
  function blocks(node) {
    if (node.nodeType === Node.ELEMENT_NODE && node.tagName === "DIV" && !node.attributes.length &&
        [...node.children].some((child) => ["P", "DIV", "H2", "H3", "H4", "PRE", "BLOCKQUOTE", "UL", "OL", "HR"].includes(child.tagName))) {
      return [...node.childNodes].flatMap(blocks);
    }
    return node.outerHTML || (node.textContent.trim() ? `<p>${escapeHtml(node.textContent)}</p>` : []);
  }
  return [...element.childNodes].flatMap(blocks);
}
