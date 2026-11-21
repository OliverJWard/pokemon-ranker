// Regenerates data/gen<N>.json from PokeAPI. Run: node scripts/build-data.mjs
// Values are copied from the API, never typed by hand.
import { readFile, writeFile } from "node:fs/promises";
import { resolvePokemon, STAT_KEYS } from "../src/resolve.mjs";

const API = "https://pokeapi.co/api/v2";
const CONCURRENCY = 4; // PokeAPI asks clients to be gentle
const root = new URL("../", import.meta.url);

async function getJson(url, attempts = 4) {
  for (let i = 1; ; i++) {
    try {
      // PokeAPI rejects the default fetch-less user agents; a generic one is fine.
      const res = await fetch(url, { headers: { "User-Agent": "data-build-script/1.0" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (i === attempts) throw new Error(`${url}: ${err.message}`);
      await new Promise((r) => setTimeout(r, 500 * i));
    }
  }
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

// One row per line keeps diffs reviewable.
function serialise({ generation, source, stats, pokemon }) {
  const rows = pokemon.map((p) => "    " + JSON.stringify(p)).join(",\n");
  return [
    "{",
    `  "generation": ${generation},`,
    `  "source": ${JSON.stringify(source)},`,
    `  "stats": ${JSON.stringify(stats)},`,
    `  "pokemon": [`,
    rows,
    "  ]",
    "}",
    "",
  ].join("\n");
}

function validate(pokemon, expectedCount) {
  if (pokemon.length !== expectedCount) throw new Error(`Expected ${expectedCount} species, got ${pokemon.length}`);
  for (const p of pokemon) {
    if (!p.name || p.types.length < 1 || p.types.length > 2) throw new Error(`Bad record: ${JSON.stringify(p)}`);
  }
}

const { games } = JSON.parse(await readFile(new URL("data/games.json", root), "utf8"));

// Games sharing a generation share one file covering the widest species range.
const ranges = new Map();
for (const g of games) {
  const [from, to] = g.species;
  const cur = ranges.get(g.generation);
  ranges.set(g.generation, cur ? [Math.min(cur[0], from), Math.max(cur[1], to)] : [from, to]);
}

for (const [generation, [from, to]] of ranges) {
  const ids = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  console.log(`Generation ${generation}: fetching species ${from}-${to}…`);
  const pokemon = await mapLimit(ids, CONCURRENCY, async (id) => {
    const [p, s] = await Promise.all([getJson(`${API}/pokemon/${id}`), getJson(`${API}/pokemon-species/${id}`)]);
    return resolvePokemon(p, s, generation);
  });
  validate(pokemon, ids.length);
  const file = {
    generation,
    source: { name: "PokeAPI", url: "https://pokeapi.co/", retrieved: new Date().toISOString().slice(0, 10) },
    stats: STAT_KEYS.map(({ key, label }) => ({ key, label })),
    pokemon,
  };
  await writeFile(new URL(`data/gen${generation}.json`, root), serialise(file));
  console.log(`  wrote data/gen${generation}.json`);
}
