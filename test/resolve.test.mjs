import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolveStats, resolveTypes, resolvePokemon, generationNumber, assertSupported } from "../src/resolve.mjs";

// Minimal builders for PokeAPI response shapes.
const stats = (hp, atk, def, spa, spd, spe) =>
  Object.entries({ hp, attack: atk, defense: def, "special-attack": spa, "special-defense": spd, speed: spe })
    .map(([name, base_stat]) => ({ base_stat, stat: { name } }));
const past = (gen, changes) => ({
  generation: { name: `generation-${gen}` },
  stats: Object.entries(changes).map(([name, base_stat]) => ({ base_stat, stat: { name } })),
});
const types = (...names) => names.map((name, i) => ({ slot: i + 1, type: { name } }));
const pastTypes = (gen, ...names) => ({ generation: { name: `generation-${gen}` }, types: types(...names) });

// Real PokeAPI data for Butterfree: SpA was 80 up to and including Gen V.
const butterfreePast = [past("i", { special: 80 }), past("v", { "special-attack": 80 })];

test("generationNumber parses roman numerals", () => {
  assert.equal(generationNumber("generation-iii"), 3);
  assert.equal(generationNumber("generation-ix"), 9);
  assert.throws(() => generationNumber("generation-xx"));
});

test("Gen III uses the old value when a later generation changed it", () => {
  const out = resolveStats(stats(60, 45, 50, 90, 80, 70), butterfreePast, 3);
  assert.equal(out.spa, 80);
});

test("the generation a change was made in already uses the old value", () => {
  assert.equal(resolveStats(stats(60, 45, 50, 90, 80, 70), butterfreePast, 5).spa, 80);
  assert.equal(resolveStats(stats(60, 45, 50, 90, 80, 70), butterfreePast, 6).spa, 90);
});

test("Gen I special entries are ignored for Gen II+", () => {
  const out = resolveStats(stats(60, 45, 50, 90, 80, 70), [past("i", { special: 1 })], 3);
  assert.deepEqual(out, { hp: 60, atk: 45, def: 50, spa: 90, spd: 80, spe: 70 });
});

test("a stat changed in several generations resolves to the earliest qualifying value", () => {
  // Current 100; was 90 until Gen VI; was 80 until Gen IV.
  const history = [past("vi", { speed: 90 }), past("iv", { speed: 80 })];
  assert.equal(resolveStats(stats(1, 1, 1, 1, 1, 100), history, 3).spe, 80);
  assert.equal(resolveStats(stats(1, 1, 1, 1, 1, 100), history, 5).spe, 90);
  assert.equal(resolveStats(stats(1, 1, 1, 1, 1, 100), history, 7).spe, 100);
});

test("changes to different stats in different generations all apply", () => {
  const history = [past("vi", { attack: 10 }), past("v", { defense: 20 })];
  const out = resolveStats(stats(1, 99, 99, 1, 1, 1), history, 3);
  assert.equal(out.atk, 10);
  assert.equal(out.def, 20);
});

test("missing stats fail loudly", () => {
  assert.throws(() => resolveStats(stats(1, 1, 1, 1, 1, 1).slice(1), [], 3), /Missing stat/);
});

test("types: Magnemite is Electric/Steel in Gen III but Electric in Gen I", () => {
  const history = [pastTypes("i", "electric")];
  assert.deepEqual(resolveTypes(types("electric", "steel"), history, 3), ["Electric", "Steel"]);
  assert.deepEqual(resolveTypes(types("electric", "steel"), history, 1), ["Electric"]);
});

test("types: Fairy typing is absent before Gen VI", () => {
  const history = [pastTypes("v", "normal")];
  assert.deepEqual(resolveTypes(types("fairy"), history, 3), ["Normal"]);
  assert.deepEqual(resolveTypes(types("fairy"), history, 6), ["Fairy"]);
});

test("types are ordered by slot", () => {
  const shuffled = [{ slot: 2, type: { name: "flying" } }, { slot: 1, type: { name: "fire" } }];
  assert.deepEqual(resolveTypes(shuffled, [], 3), ["Fire", "Flying"]);
});

test("Gen I is rejected until the single Special stat is modelled", () => {
  assert.throws(() => assertSupported(1), /not supported/);
  assert.throws(() => assertSupported("3"));
  assert.doesNotThrow(() => assertSupported(3));
});

test("resolvePokemon builds a record with the English name", () => {
  const rec = resolvePokemon(
    { types: types("bug", "flying"), stats: stats(60, 45, 50, 90, 80, 70), past_stats: butterfreePast, past_types: [] },
    { id: 12, names: [{ language: { name: "fr" }, name: "Papilusion" }, { language: { name: "en" }, name: "Butterfree" }] },
    3,
  );
  assert.deepEqual(rec, {
    id: 12, name: "Butterfree", types: ["Bug", "Flying"],
    stats: { hp: 60, atk: 45, def: 50, spa: 80, spd: 80, spe: 70 },
  });
});

// Guards the committed snapshot against a bad regeneration.
test("data/gen3.json spot checks", async () => {
  const { pokemon } = JSON.parse(await readFile(new URL("../data/gen3.json", import.meta.url), "utf8"));
  assert.equal(pokemon.length, 151);
  assert.deepEqual(pokemon.map((p) => p.id), Array.from({ length: 151 }, (_, i) => i + 1));
  assert.equal(pokemon[11].stats.spa, 80); // Butterfree
  assert.deepEqual(pokemon[80].types, ["Electric", "Steel"]); // Magnemite
  assert.equal(pokemon[149].stats.spa, 154); // Mewtwo, unchanged across generations
});
