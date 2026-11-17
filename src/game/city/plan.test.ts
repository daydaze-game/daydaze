// The active city plan uses dream architecture, preserving streets and trees.
import { test } from "node:test";
import assert from "node:assert/strict";
import type { Vec2 } from "../walk.ts";
import { ALL_CELLS, cellAt, cellsWithin, VIEW_RADIUS } from "./cells.ts";
import { BUILDINGS, CITY_SPAWN } from "./layout.ts";
import { DREAM_MODEL_COST } from "./dreamCosts.generated.ts";
import { DREAM_LANDMARK_COST } from "./dreamLandmarkCosts.generated.ts";
import { BAY_RANGE } from "./tuning.ts";
import {
  drawCallsOf,
  FACADE_KINDS,
  KINDS,
  GARDEN_FIRST,
  isGardenAt,
  planCity,
  TREE_VARIANTS,
  trianglesOf,
} from "./plan.ts";
const origin: Vec2 = [0, 0];

test("active architecture replaces every old body, bay, lot, house and far box", () => {
  for (const at of [
    [0, 0],
    [-300, -8],
    [262, -8],
    [-96, -256],
    [264, -256],
    [-380, -256],
    [0, 256],
  ] satisfies Vec2[]) {
    const plan = planCity(cellsWithin(at, VIEW_RADIUS), 2, at, BAY_RANGE.low);
    assert.ok(plan.dream.length > 0, `${at}`);
    for (const k of FACADE_KINDS) assert.equal(plan.instances[k].length, 0, k);
    for (const k of [
      "roof",
      "roofGravel",
      "roofSkin",
      "window",
      "band",
    ] as const)
      assert.equal(plan.instances[k].length, 0, k);
    assert.deepEqual(
      [plan.bays, plan.lots, plan.houses, plan.far],
      [[], [], [], []],
    );
  }
});

test("architecture has exactly one active LOD per module, and no duplicate IDs", () => {
  const p = planCity(ALL_CELLS, 2, origin, 50);
  assert.equal(new Set(p.dream.map((s) => s.id)).size, p.dream.length);
  assert.ok(p.dream.some((s) => s.far));
  assert.ok(p.dream.some((s) => !s.far));
  assert.ok(planCity([], 0, origin, 50).dream.every((s) => s.far));
});

test("arrival landmarks keep their sculpted facades in street and overview views", () => {
  for (const range of [0, 50, 90]) {
    const p = planCity(
      cellsWithin(CITY_SPAWN.position, VIEW_RADIUS),
      2,
      CITY_SPAWN.position,
      range,
    );
    for (const id of ["arcade-square", "vesper-hotel"])
      assert.ok(
        p.dream.some((s) => s.id.startsWith(`${id}:`) && !s.far),
        `${id}, range ${range}`,
      );
  }
});

test("ground stays clipped to loaded cells while distant architecture carries the skyline", () => {
  const cells = [cellAt([-160, 30])];
  const p = planCity(cells, 0, origin, 50);
  for (const kind of ["road", "sidewalk", "lane"] as const)
    for (const i of p.instances[kind])
      assert.ok(
        cells.some(
          (c) => i.x >= c.x0 && i.x <= c.x1 && i.z >= c.z0 && i.z <= c.z1,
        ),
        kind,
      );
  assert.ok(p.dream.some((s) => s.far));
  assert.ok(p.dream.length < BUILDINGS.length);
});

test("venue signs stay at human scale and lights are the nearest requested signs", () => {
  const p = planCity(ALL_CELLS, 2, [110, -20], 50);
  assert.equal(p.lights.length, 2);
  assert.ok(p.instances.sign.length > 0);
  for (const s of p.instances.sign) {
    assert.ok(s.y >= 4 && s.y <= 6);
    assert.ok(s.sx <= 6 && s.sy <= 1.5);
  }
  assert.equal(p.instances.label.length, p.instances.sign.length);
  const d = (l: { x: number; z: number }) => Math.hypot(l.x - 110, l.z + 20);
  assert.ok(d(p.lights[0]!) <= d(p.lights[1]!));
  assert.ok(d(p.lights[0]!) < 30);
  assert.equal(planCity(ALL_CELLS, 0, origin).lights.length, 0);
});

test("the plan prices dream near and far geometry from generated model costs", () => {
  const p = planCity(cellsWithin(origin, VIEW_RADIUS), 2, origin, 50);
  const cost = p.dream.reduce(
    (n, s) =>
      n +
      (s.landmark ? DREAM_LANDMARK_COST[s.landmark] : DREAM_MODEL_COST[s.kind])[
        s.far ? "lo" : "tris"
      ],
    0,
  );
  assert.equal(trianglesOf({ ...p, dream: [] }) + cost, trianglesOf(p));
  assert.equal(
    drawCallsOf({ ...p, dream: [] }) +
      new Set(
        p.dream.filter((s) => !s.landmark).map((s) => `${s.kind}${s.far}`),
      ).size +
      p.dream.reduce(
        (n, s) =>
          n +
          (s.landmark
            ? DREAM_LANDMARK_COST[s.landmark][s.far ? "loParts" : "parts"]
            : 0),
        0,
      ),
    drawCallsOf(p),
  );
});

test("streamed plans fit 250 draw calls and 300k triangles before live scenery", () => {
  for (let x = -432; x <= 432; x += 32)
    for (let z = -304; z <= 368; z += 32) {
      const at: Vec2 = [x, z];
      const p = planCity(cellsWithin(at, VIEW_RADIUS), 2, at, 50);
      assert.ok(drawCallsOf(p) < 250, `${at}`);
      assert.ok(
        trianglesOf(p) < 300000,
        `${trianglesOf(p)} triangles at ${at}`,
      );
    }
});

test("every active instance has finite position and positive size", () => {
  const p = planCity(ALL_CELLS, 2, CITY_SPAWN.position, 50);
  for (const k of KINDS)
    for (const i of p.instances[k]) {
      for (const v of [i.x, i.y, i.z, i.sx, i.sy, i.sz])
        assert.ok(Number.isFinite(v), k);
      assert.ok(i.sx > 0 && i.sy > 0 && i.sz > 0, k);
    }
});

test("street trees come as spots for the tree models, not boxes and balls", () => {
  const plan = planCity(ALL_CELLS, 0, origin);
  assert.ok(plan.trees.length > 50, `${plan.trees.length} trees`);
  for (const t of plan.trees) {
    assert.ok(
      Number.isInteger(t.variant) &&
        t.variant >= 0 &&
        t.variant < TREE_VARIANTS,
    );
    assert.ok(t.scale > 0.6 && t.scale < 1.4);
  }
  // every variant shows up, so streets aren't one tree cloned
  assert.equal(new Set(plan.trees.map((t) => t.variant)).size, TREE_VARIANTS);
  // birches and maples grow on Suburbia's and the park's lawns, not on the avenues
  const garden = (t: { variant: number }) => t.variant >= GARDEN_FIRST;
  for (const t of plan.trees)
    if (garden(t)) assert.ok(isGardenAt(t.x, t.z), `${t.x},${t.z}`);
  const lawns = plan.trees.filter((t) => isGardenAt(t.x, t.z));
  assert.ok(
    lawns.length > 20 && lawns.filter(garden).length > lawns.length / 3,
  );
  // the old sphere canopies are only the palms' coconuts now
  assert.ok(plan.instances.treeTrunk.length === 0);
  // the same spot always grows the same tree
  assert.deepEqual(planCity(ALL_CELLS, 0, origin).trees, plan.trees);
});
