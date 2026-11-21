import test from "node:test";
import assert from "node:assert/strict";
import { compileFormula, compileForRoster } from "../src/formula.mjs";
import { PRESETS } from "../src/presets.mjs";

const KEYS = ["hp", "atk", "def", "spa", "spd", "spe"];
const mon = { hp: 10, atk: 20, def: 30, spa: 40, spd: 50, spe: 60 };
const calc = (src, stats = mon) => compileFormula(src, KEYS)(stats);

test("arithmetic and precedence", () => {
  assert.equal(calc("1 + 2 * 3"), 7);
  assert.equal(calc("(1 + 2) * 3"), 9);
  assert.equal(calc("10 - 4 - 3"), 3); // left-associative
  assert.equal(calc("8 / 4 / 2"), 1);
});

test("exponent is right-associative and binds tighter than unary minus", () => {
  assert.equal(calc("2 ^ 3 ^ 2"), 512);
  assert.equal(calc("-2 ^ 2"), -4);
  assert.equal(calc("2 ^ -1"), 0.5);
  assert.equal(calc("--3"), 3);
});

test("variables, bst and case-insensitivity", () => {
  assert.equal(calc("hp + SPE"), 70);
  assert.equal(calc("bst"), 210);
});

test("functions", () => {
  assert.equal(calc("min(def, spd)"), 30);
  assert.equal(calc("max(atk, spa, 100)"), 100);
  assert.equal(calc("abs(hp - spe)"), 50);
});

test("decimals", () => {
  assert.equal(calc("atk * 1.5"), 30);
  assert.equal(calc(".5 * hp"), 5);
});

test("syntax errors are reported, not thrown as anything else", () => {
  const cases = [
    ["", /end of formula/],
    ["1 +", /end of formula/],
    ["(1 + 2", /Missing closing/],
    ["1 2", /trailing/],
    ["1.2.3", /Malformed number/],
    ["2hp", /Malformed number/],
    [".", /Unexpected character/],
    ["hp $ atk", /Unexpected character "\$"/],
    ["foo", /Unknown variable "foo"/],
    ["sqrt(hp)", /Unknown function/],
    ["abs(hp, atk)", /abs\(\) takes 1 argument/],
    ["min()", /min\(\) takes at least 1/],
    ["min(1,", /end of formula/],
  ];
  for (const [src, pattern] of cases) assert.throws(() => calc(src), pattern, `"${src}"`);
});

test("non-finite results are rejected", () => {
  assert.throws(() => calc("hp / 0"), /non-numeric/);
  assert.throws(() => calc("0 / 0"), /non-numeric/);
});

test("object-prototype names are not variables", () => {
  assert.throws(() => calc("constructor"), /Unknown variable/);
  assert.throws(() => calc("__proto__"), /Unknown variable/);
});

test("compileForRoster rejects a formula that fails for any species", () => {
  const roster = [{ stats: mon }, { stats: { ...mon, atk: 0 } }];
  assert.throws(() => compileForRoster("hp / atk", KEYS, roster), /non-numeric/);
  assert.doesNotThrow(() => compileForRoster("hp + atk", KEYS, roster));
});

test("every preset compiles", () => {
  for (const p of PRESETS) assert.doesNotThrow(() => calc(p.formula), p.id);
});
