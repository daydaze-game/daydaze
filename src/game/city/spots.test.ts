// Named city spots (?spot=<building-id>): in front of a door, or on the street
// side of a doorless building, back to it so the full camera frames it; unknown
// ids are null.
import assert from "node:assert/strict";
import { test } from "node:test";
import { yawTowards, type Vec2 } from "../walk.ts";
import { BUILDINGS, type Building } from "./layout.ts";
import { spotFor } from "./spots.ts";

/** The heading straight away from `to`, within a hair. */
const facesAway = (yaw: number, from: readonly number[], to: Vec2) => {
  const towards = yawTowards([from[0] ?? 0, from[1] ?? 0], to);
  return Math.abs(Math.cos(yaw - towards) + 1) < 1e-9;
};

const centroid = (b: Building): [number, number] => [
  b.footprint.reduce((s, p) => s + p[0], 0) / b.footprint.length,
  b.footprint.reduce((s, p) => s + p[1], 0) / b.footprint.length,
];
const dist = (a: readonly number[], b: readonly number[]) =>
  Math.hypot((a[0] ?? 0) - (b[0] ?? 0), (a[1] ?? 0) - (b[1] ?? 0));
const inside = (b: Building, [x, z]: readonly number[]) => {
  const xs = b.footprint.map((p) => p[0]);
  const zs = b.footprint.map((p) => p[1]);
  return (
    (x ?? 0) > Math.min(...xs) &&
    (x ?? 0) < Math.max(...xs) &&
    (z ?? 0) > Math.min(...zs) &&
    (z ?? 0) < Math.max(...zs)
  );
};

test("a door spot stands outside the door's trigger, back to the door", () => {
  for (const b of BUILDINGS) {
    if (!b.door) continue;
    const spot = spotFor(b.id);
    assert.ok(spot, b.id);
    const door = b.door.position;
    assert.ok(dist(spot.position, door) > b.door.radius, b.id);
    // out from the building, not into it
    assert.ok(dist(spot.position, centroid(b)) > dist(door, centroid(b)), b.id);
    assert.ok(facesAway(spot.yaw, spot.position, door), b.id);
  }
});

test("a doorless building's spot is outside it, back to it", () => {
  const doorless = BUILDINGS.filter((b) => !b.door);
  assert.ok(doorless.length > 0);
  for (const b of doorless) {
    const spot = spotFor(b.id);
    assert.ok(spot, b.id);
    assert.ok(!inside(b, spot.position), b.id);
    assert.ok(facesAway(spot.yaw, spot.position, centroid(b)), b.id);
  }
});

test("an unknown building has no spot", () => {
  assert.equal(spotFor("nowhere"), null);
  assert.equal(spotFor(""), null);
});
