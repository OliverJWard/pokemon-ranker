import test from "node:test";
import assert from "node:assert/strict";
import { rankRoster, filterRanked, barFraction } from "../src/ranking.mjs";

const mk = (id, name, types, score) => ({ id, name, types, stats: { score } });
const roster = [
  mk(1, "Bulbasaur", ["Grass", "Poison"], 50),
  mk(2, "Charmander", ["Fire"], 80),
  mk(3, "Squirtle", ["Water"], 80),
  mk(4, "Pidgey", ["Normal", "Flying"], 20),
];
const byScore = (s) => s.score;

test("descending order with tied entries sharing a rank", () => {
  const ranked = rankRoster(roster, byScore, "desc");
  assert.deepEqual(ranked.map((e) => e.p.name), ["Charmander", "Squirtle", "Bulbasaur", "Pidgey"]);
  assert.deepEqual(ranked.map((e) => e.rank), [1, 1, 3, 4]);
});

test("ascending order ranks from the lowest score", () => {
  const ranked = rankRoster(roster, byScore, "asc");
  assert.deepEqual(ranked.map((e) => e.p.name), ["Pidgey", "Bulbasaur", "Charmander", "Squirtle"]);
  assert.deepEqual(ranked.map((e) => e.rank), [1, 2, 3, 3]);
});

test("ties are ordered by id so results are stable", () => {
  const shuffled = [roster[2], roster[1]];
  assert.deepEqual(rankRoster(shuffled, byScore).map((e) => e.p.id), [2, 3]);
});

test("filtering keeps global ranks", () => {
  const filtered = filterRanked(rankRoster(roster, byScore), "pidg");
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].rank, 4);
});

test("filter matches names and types, ignoring case and whitespace", () => {
  const ranked = rankRoster(roster, byScore);
  assert.deepEqual(filterRanked(ranked, "  FIRE ").map((e) => e.p.name), ["Charmander"]);
  assert.deepEqual(filterRanked(ranked, "poison").map((e) => e.p.name), ["Bulbasaur"]);
  assert.equal(filterRanked(ranked, "").length, 4);
  assert.equal(filterRanked(ranked, "zzz").length, 0);
});

test("barFraction scales across the range and never collapses to zero", () => {
  assert.equal(barFraction(100, 0, 100), 1);
  assert.equal(barFraction(50, 0, 100), 0.5);
  assert.equal(barFraction(0, 0, 100), 0.02);
  assert.equal(barFraction(7, 7, 7), 1); // all scores equal
});
