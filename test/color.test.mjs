import test from "node:test";
import assert from "node:assert/strict";
import { contrast, readableText } from "../src/color.mjs";
import { TYPE_COLORS } from "../src/types.mjs";

test("contrast extremes", () => {
  assert.equal(contrast("#000000", "#FFFFFF").toFixed(1), "21.0");
  assert.equal(contrast("#777777", "#777777"), 1);
});

test("readableText picks the higher-contrast option", () => {
  assert.equal(readableText("#F7D02C"), "#12151A"); // Electric yellow
  assert.equal(readableText("#735797"), "#FFFFFF"); // Ghost purple
});

test("every type badge meets WCAG AA (4.5:1) for normal text", () => {
  for (const [type, bg] of Object.entries(TYPE_COLORS)) {
    assert.ok(contrast(bg, readableText(bg)) >= 4.5, `${type} ${bg}`);
  }
});

test("invalid colours throw", () => {
  assert.throws(() => readableText("red"), /Expected #rrggbb/);
});
