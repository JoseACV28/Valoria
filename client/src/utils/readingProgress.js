const KEY_PREFIX = "valoria-reading-progress:";

export function readChapterIndex(storyId, userId, chapters, storage = globalThis.localStorage) {
  try {
    const progress = JSON.parse(storage.getItem(`${KEY_PREFIX}${userId || "guest"}`) || "{}");
    const index = chapters.findIndex((chapter) => chapter.id === progress[storyId]?.chapterId);
    return Math.max(0, index);
  } catch {
    return 0;
  }
}

export function saveReadingProgress(storyId, userId, chapterId, storage = globalThis.localStorage) {
  if (!storyId || !chapterId) return;
  try {
    const key = `${KEY_PREFIX}${userId || "guest"}`;
    let progress;
    try { progress = JSON.parse(storage.getItem(key) || "{}"); } catch { progress = {}; }
    const entries = Object.entries({
      ...progress,
      [storyId]: { chapterId, updatedAt: Date.now() }
    }).sort((a, b) => b[1].updatedAt - a[1].updatedAt).slice(0, 100);
    storage.setItem(key, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // La lectura sigue disponible si el navegador bloquea almacenamiento local.
  }
}
