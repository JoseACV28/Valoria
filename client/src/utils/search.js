export const SEARCH_TYPES = [
  ["all", "Todo"], ["stories", "Historias"], ["illustrations", "Ilustraciones"],
  ["writers", "Escritores"], ["illustrators", "Ilustradores"]
];

export function normalizeSearch(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export function searchLink(query, field = "") {
  const params = new URLSearchParams({ q: query, type: "stories" });
  if (field) params.set("field", field);
  return `#/search?${params}`;
}

export function terms(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string" && item.trim()) : [];
}

export function matchesWork(work, query, field = "", category = "") {
  if (category && work.category !== category && !terms(work.categories).includes(category)) return false;
  const needle = normalizeSearch(query);
  if (!needle) return true;
  if (field === "character" || field === "tag") {
    return terms(field === "character" ? work.characters : work.tags).some((value) => normalizeSearch(value) === needle);
  }
  const text = normalizeSearch([work.title, work.description, work.author, work.category, ...terms(work.categories), ...terms(work.tags), ...terms(work.characters)].join(" "));
  return needle.split(/\s+/).every((part) => text.includes(part));
}

export function creatorsFromWorks(works, query = "") {
  const map = new Map();
  for (const work of works) {
    const id = work.authorId || work.author_id || work.profileId || work.profile_id;
    if (!id) continue;
    const creator = map.get(id) || { id, name: work.author || "Creador de Valoria", avatar: work.authorAvatarUrl || work.author_avatar_url || "", count: 0 };
    creator.count += 1;
    map.set(id, creator);
  }
  const parts = normalizeSearch(query).split(/\s+/).filter(Boolean);
  return [...map.values()].filter((creator) => parts.every((part) => normalizeSearch(creator.name).includes(part))).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
