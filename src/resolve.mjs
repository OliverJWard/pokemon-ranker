// Pure logic: turns PokeAPI responses into per-generation records.
// PokeAPI's top-level stats/types are the *current* values; `past_stats` and
// `past_types` list what they were up to and including a given generation.

export const STAT_KEYS = [
  { key: "hp", label: "HP", api: "hp" },
  { key: "atk", label: "ATK", api: "attack" },
  { key: "def", label: "DEF", api: "defense" },
  { key: "spa", label: "SPA", api: "special-attack" },
  { key: "spd", label: "SPD", api: "special-defense" },
  { key: "spe", label: "SPE", api: "speed" },
];

const ROMAN = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix"];

export function generationNumber(name) {
  const n = ROMAN.indexOf(String(name).replace(/^generation-/, "")) + 1;
  if (n === 0) throw new Error(`Unknown generation "${name}"`);
  return n;
}

// Gen I has a single Special stat, which this stat model can't express.
export function assertSupported(generation) {
  if (!Number.isInteger(generation) || generation < 2) {
    throw new Error(`Generation ${generation} is not supported (Gen II or later only)`);
  }
}

// Entries for generations >= target describe older values. Apply latest first so
// the earliest qualifying entry wins, since a stat can change in several generations.
function entriesFrom(past, generation) {
  return (past ?? [])
    .map((e) => ({ ...e, gen: generationNumber(e.generation.name) }))
    .filter((e) => e.gen >= generation)
    .sort((a, b) => b.gen - a.gen);
}

export function resolveStats(apiStats, pastStats, generation) {
  const byApiName = {};
  for (const s of apiStats) byApiName[s.stat.name] = s.base_stat;
  for (const entry of entriesFrom(pastStats, generation)) {
    for (const s of entry.stats) byApiName[s.stat.name] = s.base_stat;
  }
  const out = {};
  for (const { key, api } of STAT_KEYS) {
    if (!Number.isInteger(byApiName[api])) throw new Error(`Missing stat "${api}"`);
    out[key] = byApiName[api];
  }
  return out;
}

const typeNames = (types) =>
  [...types].sort((a, b) => a.slot - b.slot).map((t) => capitalise(t.type.name));

const capitalise = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export function resolveTypes(apiTypes, pastTypes, generation) {
  // Each past_types entry is a full replacement; the earliest qualifying one applies.
  const entries = entriesFrom(pastTypes, generation);
  const earliest = entries[entries.length - 1];
  return typeNames(earliest ? earliest.types : apiTypes);
}

export function englishName(species) {
  const entry = species.names.find((n) => n.language.name === "en");
  if (!entry) throw new Error(`No English name for species ${species.id}`);
  return entry.name;
}

export function resolvePokemon(pokemon, species, generation) {
  assertSupported(generation);
  return {
    id: species.id,
    name: englishName(species),
    types: resolveTypes(pokemon.types, pokemon.past_types, generation),
    stats: resolveStats(pokemon.stats, pokemon.past_stats, generation),
  };
}
