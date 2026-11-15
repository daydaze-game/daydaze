// Legacy far-box helpers remain usable; the active skyline uses dream twins.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  FAR_BOX_TRIANGLES,
  FAR_CAPACITY,
  FAR_RANGE,
  FAR_ROADS,
  farBoxOf,
  farWorthDrawing,
} from "./far.ts";
import { BUILDINGS } from "./layout.ts";
import { planCity } from "./plan.ts";

test("a far box is the footprint and height, in a hex wall color", () => {
  assert.equal(FAR_CAPACITY, BUILDINGS.length);
  for (const b of BUILDINGS) {
    const box = farBoxOf(b);
    const xs = b.footprint.map(([x]) => x);
    assert.equal(box.sx, Math.max(...xs) - Math.min(...xs));
    assert.equal(box.h, b.height);
    assert.match(box.color, /^#[0-9a-f]{6}$/);
  }
  // memoized: the same box each time
  assert.equal(farBoxOf(BUILDINGS[0]!), farBoxOf(BUILDINGS[0]!));
});

test("small buildings drop out with distance, towers last, all of them past the fog", () => {
  assert.ok(farWorthDrawing(9, 100));
  assert.ok(!farWorthDrawing(9, 300));
  assert.ok(farWorthDrawing(60, 400));
  assert.ok(!farWorthDrawing(64, FAR_RANGE + 1));
});

test("the skyline uses distant dream twins instead of legacy boxes", () => {
  const p = planCity([], 0, [0, 0]);
  assert.equal(p.far.length, 0);
  assert.ok(p.dream.length > 20);
  assert.ok(p.dream.length < BUILDINGS.length);
  assert.ok(p.dream.every((s) => s.far));
  assert.equal(new Set(p.dream.map((s) => s.id)).size, p.dream.length);
});

test("every road is a far strip", () => {
  assert.ok(FAR_ROADS.length > 10);
  for (const [x0, z0, x1, z1] of FAR_ROADS) assert.ok(x1 > x0 && z1 > z0);
  assert.equal(FAR_BOX_TRIANGLES, 10);
});
