// Shared eyebrow curves must preserve existing faces while supporting new arches.
import assert from "node:assert/strict";
import { test } from "node:test";
import { BROW_DESIGNS, browRise } from "./brows.ts";

test("existing sculpted brows keep their original curve", () => {
  const brow = BROW_DESIGNS["brows-sculpted-espresso"];
  for (const t of [0, 0.1, 0.35, 0.6, 0.7, 1]) {
    const old =
      0.046 +
      0.022 * Math.sin(Math.PI * Math.min(t / 0.7, 1)) * (t < 0.7 ? 1 : 0) +
      0.004 * t -
      (t > 0.7 ? (t - 0.7) * 0.05 : 0);
    assert.ok(Math.abs(browRise(brow, t) - old) < 1e-10);
  }
});

test("straight brows stay flat across the inner brow and angled brows peak farther out", () => {
  const straight = BROW_DESIGNS["brows-natural-straight"];
  assert.equal(browRise(straight, 0.15), browRise(straight, 0.6));
  const angled = BROW_DESIGNS["brows-angled"];
  assert.ok(browRise(angled, 0.55) > browRise(angled, 0.35));
  assert.ok(BROW_DESIGNS["brows-full-straight"].thickness > straight.thickness);
});
