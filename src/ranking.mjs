// Pure ranking and filtering helpers.

// Ranks the whole roster first, then filtering keeps each entry's true rank.
// Ties share a rank and the next rank is skipped ("1, 2, 2, 4").
export function rankRoster(roster, scoreFn, direction = "desc") {
  const sign = direction === "asc" ? 1 : -1;
  const entries = roster
    .map((p) => ({ p, score: scoreFn(p.stats) }))
    .sort((a, b) => sign * (a.score - b.score) || a.p.id - b.p.id);
  entries.forEach((e, i) => {
    e.rank = i > 0 && e.score === entries[i - 1].score ? entries[i - 1].rank : i + 1;
  });
  return entries;
}

export function filterRanked(entries, text) {
  const q = text.trim().toLowerCase();
  if (!q) return entries;
  return entries.filter(({ p }) => p.name.toLowerCase().includes(q) || p.types.some((t) => t.toLowerCase().includes(q)));
}

// Bar length as 0..1 across the visible score range; a floor keeps the lowest row visible.
export function barFraction(score, min, max, floor = 0.02) {
  const range = max - min;
  return range === 0 ? 1 : Math.max(floor, (score - min) / range);
}
