// New York block dressing: which blocks get bays, storeys under a cornice, one door
// and shops per face, range-limited plans, and instanced-mesh bay limits.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cellsWithin } from "./cells.ts";
import { BUILDINGS, GALLERY_Z } from "./layout.ts";
import { emptyInstances, planCity, trianglesOf } from "./plan.ts";
import { hasPool, motelBuilding, noVacancy } from "./motel.ts";
import {
  BAY_CAPACITY,
  BAY_KINDS,
  HOUSE_MODELS,
  houseAt,
  isBeachHouse,
  isHouse,
  isMotel,
  isSuburbHouse,
  isNyc,
  nycBays,
} from "./nyc.ts";

// the blocks that face a street; those inside a lot keep plain walls
const nyc = BUILDINGS.filter((b) => isNyc(b) && nycBays(b).length > 0);
const box = (b: (typeof BUILDINGS)[number]) => {
  const xs = b.footprint.map(([x]) => x);
  const zs = b.footprint.map(([, z]) => z);
  return {
    x0: Math.min(...xs),
    x1: Math.max(...xs),
    z0: Math.min(...zs),
    z1: Math.max(...zs),
  };
};

test("only brick, storefront and tower blocks in the New York and shophouse districts get bays", () => {
  assert.ok(nyc.length > 20);
  for (const b of nyc) {
    assert.ok(["storefront", "brick", "tower"].includes(b.style), b.id);
    assert.ok(
      [
        "downtown",
        "uptown",
        "arts-district",
        "little-manila",
        "chinatown-koreatown",
      ].includes(b.neighborhood),
      b.id,
    );
  }
});

test("a building's bays are deterministic and stay within a post of its footprint", () => {
  for (const b of nyc) {
    const bays = nycBays(b);
    assert.deepEqual(nycBays(b), bays, b.id);
    assert.ok(bays.length > 0, b.id);
    const { x0, x1, z0, z1 } = box(b);
    for (const bay of bays) {
      assert.ok(BAY_KINDS.includes(bay.kind));
      assert.ok(bay.x >= x0 - 1e-6 && bay.x <= x1 + 1e-6, `${b.id} x`);
      assert.ok(bay.z >= z0 - 1e-6 && bay.z <= z1 + 1e-6, `${b.id} z`);
      assert.ok(bay.y >= 0 && bay.y < b.height, `${b.id} y`);
      // a bay is stretched to fit, never crushed or blown up
      assert.ok(bay.sx > 0.7 && bay.sx < 1.4, `${b.id} sx ${bay.sx}`);
      assert.ok(bay.sy > 0.7 && bay.sy < 1.4, `${b.id} sy ${bay.sy}`);
    }
  }
});

test("storeys land exactly under a one-meter cornice", () => {
  for (const b of nyc) {
    const tops = nycBays(b)
      .filter((bay) => bay.kind.startsWith("cornice"))
      .map((bay) => bay.y);
    assert.ok(tops.length > 0, b.id);
    for (const y of tops) assert.ok(Math.abs(y - (b.height - 1)) < 1e-6, b.id);
  }
});

test("a face has one door and shops, a cornice and a post at every corner", () => {
  const b = nyc[0];
  const bays = nycBays(b);
  const kinds = new Set(bays.map((bay) => bay.kind));
  assert.ok(kinds.has("post"));
  assert.ok([...kinds].some((k) => k.startsWith("door")));
  assert.ok([...kinds].some((k) => k.startsWith("shop")));
  assert.equal(
    bays.filter((bay) => bay.kind === "post" && bay.y === 0).length,
    4,
  );
});

test("legacy bays remain usable separately, but the city plan uses dream models", () => {
  const at: [number, number] = [-30, -6];
  const p = planCity(cellsWithin(at, 160), 0, at, 50);
  assert.equal(p.bays.length, 0);
  assert.ok(p.dream.some((s) => !s.far));
  assert.ok(nyc.flatMap(nycBays).length > BAY_CAPACITY);
  assert.ok(trianglesOf(p) > 0);
});

test("legacy Suburbia houses face the street while active plans use dream modules", () => {
  const lots = BUILDINGS.filter(isSuburbHouse);
  assert.ok(lots.length >= 6);
  for (const b of lots) {
    const spot = houseAt(b);
    const { x0, x1, z0, z1 } = box(b);
    assert.ok(spot.x > x0 && spot.x < x1 && spot.z > z0 && spot.z < z1, b.id);
    assert.ok(spot.variant >= 0 && spot.variant < HOUSE_MODELS.length);
    // the door side points at Maple Drive
    assert.equal(Math.cos(spot.yaw) > 0, (z0 + z1) / 2 < GALLERY_Z, b.id);
  }
  const at = lots.map((b) => houseAt(b))[0];
  const near = planCity(cellsWithin([at.x, at.z], 160), 0, [at.x, at.z], 40);
  const far = planCity(cellsWithin([at.x, at.z], 160), 0, [at.x, at.z], 0);
  assert.equal(near.houses.length, 0);
  assert.ok(near.dream.length > 0);
  assert.equal(far.houses.length, 0);
});

test("Beachside's beach-front cottages: a lot's model fits it, faces south and stays under the height cap", () => {
  const lots = BUILDINGS.filter(isBeachHouse);
  assert.ok(lots.length >= 2, `${lots.length} lots`);
  for (const b of lots) {
    const spot = houseAt(b);
    const { x0, x1, z0, z1 } = box(b);
    assert.ok(HOUSE_MODELS[spot.variant]?.startsWith("beachside/"), b.id);
    assert.ok(spot.x > x0 && spot.x < x1 && spot.z > z0 && spot.z < z1, b.id);
    assert.ok(spot.scale > 0 && spot.scale <= x1 - x0, b.id);
    assert.equal(Math.cos(spot.yaw) > 0, true, b.id);
  }
});

test("Palm Court's motels are dressed strips with a sign and a court, never house models", () => {
  const motels = BUILDINGS.filter(isMotel);
  assert.equal(motels.length, 12);
  for (const b of motels) assert.equal(isHouse(b), false, b.id);
  const out = emptyInstances();
  for (const b of motels) motelBuilding(b, out);
  // doors, windows, a pylon's neon panels and the pools' water
  assert.ok(out.window.length >= 12 * 6, `${out.window.length} windows`);
  assert.ok(out.panel.length >= 12 * 2);
  assert.equal(out.lane.length, motels.filter((_, n) => hasPool(n)).length);
  assert.ok(
    motels.some((_, n) => hasPool(n)) && motels.some((_, n) => noVacancy(n)),
  );
});
