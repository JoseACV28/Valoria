// Input is the public catalog, already filtered for blocked accounts.
export function categoryCounts(stories, illustrations) {
  const counts = new Map();
  for (const [type, works] of [['stories', stories], ['illustrations', illustrations]]) {
    for (const work of works) {
      for (const name of new Set([work.category, ...(work.categories || [])].filter(Boolean))) {
        const entry = counts.get(name) || {stories: 0, illustrations: 0};
        entry[type]++;
        counts.set(name, entry);
      }
    }
  }
  return Object.fromEntries(counts);
}
