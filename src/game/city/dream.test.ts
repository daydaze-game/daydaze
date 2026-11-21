// Dream architecture keeps the city walkable while each street has its own skyline.
import assert from "node:assert/strict";
import { test } from "node:test";
import { BUILDINGS, rect, type Building } from "./layout.ts";
import { DREAM_KINDS, dreamBuilding } from "./dream.ts";
import { facingOf } from "./dressing.ts";

const spots = (b: Building) => dreamBuilding(b, [0, 0], 36);

test("every building gets deterministic dream architecture with finite scales", () => {
  const used = new Set<string>();
  for (const b of BUILDINGS) {
    const a = spots(b);
    assert.ok(a.length > 0, b.id);
    assert.deepEqual(spots(b), a, b.id);
    for (const s of a) {
      used.add(s.kind);
      assert.ok(DREAM_KINDS.includes(s.kind));
      for (const v of [s.x, s.y, s.z, s.sx, s.sy, s.sz, s.yaw])
        assert.ok(Number.isFinite(v), b.id);
      assert.ok(s.sx > 0 && s.sy > 0 && s.sz > 0, b.id);
      assert.equal(s.y, 0.14);
      assert.ok(
        s.sx <= 2.4 + 1e-6,
        `${b.id} stretches across too much frontage`,
      );
    }
  }
  assert.equal(used.size, DREAM_KINDS.length);
});

test("module bodies exactly tile the original collision footprint", () => {
  for (const b of BUILDINGS) {
    const { front: f } = facingOf(b);
    const a = spots(b);
    const total = a.reduce((n, s) => n + s.sx * 20 * s.sz * 16, 0);
    assert.ok(Math.abs(total - f.w * (f.z1 - f.z0)) < 1e-5, b.id);
    for (const s of a) {
      const cos = Math.cos(s.yaw),
        sin = Math.sin(s.yaw);
      for (const x of [-10, 10])
        for (const z of [-8, 8]) {
          const px = s.x + x * s.sx * cos + z * s.sz * sin;
          const pz = s.z - x * s.sx * sin + z * s.sz * cos;
          const xs = b.footprint.map((p) => p[0]),
            zs = b.footprint.map((p) => p[1]);
          assert.ok(
            px >= Math.min(...xs) - 1e-6 && px <= Math.max(...xs) + 1e-6,
            b.id,
          );
          assert.ok(
            pz >= Math.min(...zs) - 1e-6 && pz <= Math.max(...zs) + 1e-6,
            b.id,
          );
        }
    }
  }
});

test("venue entrances align with a module's center and face the existing door", () => {
  for (const b of BUILDINGS.filter((b) => b.door)) {
    assert.ok(b.door);
    const { front: f, yaw } = facingOf(b);
    const turn = yaw + (f.out1 < 0 ? Math.PI : 0);
    const a = spots(b);
    const door = b.door.position;
    const centered = a.some(
      (s) =>
        Math.abs(
          (door[0] - s.x) * Math.cos(turn) - (door[1] - s.z) * Math.sin(turn),
        ) < 1e-5,
    );
    assert.ok(centered, b.id);
    assert.ok(
      a.every((s) => Math.abs(Math.sin(s.yaw - turn)) < 1e-6),
      b.id,
    );
  }
});

test("each district has its own varied family signature", () => {
  const signatures = new Set<string>();
  for (const district of new Set(BUILDINGS.map((b) => b.neighborhood))) {
    const local = BUILDINGS.filter((b) => b.neighborhood === district);
    const kinds = new Set(local.flatMap((b) => spots(b).map((s) => s.kind)));
    assert.ok(kinds.size >= 3, district);
    signatures.add([...kinds].sort().join(","));
    const stripes = new Map<number, Set<string>>();
    for (const b of local) {
      const { front: f } = facingOf(b);
      const stripe = Math.floor(f.cz / 64);
      const used = stripes.get(stripe) ?? new Set<string>();
      for (const s of spots(b)) used.add(s.kind);
      stripes.set(stripe, used);
    }
    assert.ok(
      [...stripes.values()].filter((s) => s.size >= 2).length > 0,
      district,
    );
  }
  assert.ok(
    signatures.size >= 7,
    `${signatures.size} distinct district signatures`,
  );
});

test("arrival landmarks and nightlife have deliberately distinct silhouettes", () => {
  const expected = {
    "glass-tower": "observatory",
    "pixel-arcade": "theater",
    "arcade-square": "conservatory",
    "vesper-hotel": "palazzo",
    pulse: "ribbon",
    "sugar-rush-club": "theater",
    "velvet-room": "palazzo",
    "la-noche": "lantern",
    bassline: "terrace",
  };
  for (const [id, kind] of Object.entries(expected)) {
    const b = BUILDINGS.find((b) => b.id === id);
    assert.ok(b, id);
    assert.ok(
      spots(b).some((s) => s.kind === kind),
      id,
    );
  }
});

test("detail depends on distance to the body, so long frontages do not pop out nearby", () => {
  const b: Building = {
    id: "test-wide",
    neighborhood: "downtown",
    footprint: rect(-50, 10, 50, 40),
    height: 16,
    style: "brick",
  };
  const a = dreamBuilding(b, [-45, 9], 12);
  assert.ok(a.some((s) => !s.far));
  assert.ok(a.some((s) => s.far));
  assert.ok(dreamBuilding(b, [-45, 9], 0).every((s) => s.far));
});

test("detailed landmarks replace one central module each without repeating on wings", () => {
  const expected = new Map([
    ["bus-shelter-block", "manor"],
    ["mural-wall", "clocktower"],
    ["vesper-hotel", "palace"],
    ["florist", "greenhouse"],
    ["arcade-square", "rotunda"],
    ["pawn-gadgets", "shopfront"],
  ]);
  const all = BUILDINGS.flatMap((b) => {
    const modules = spots(b);
    const detailed = modules.filter((s) => s.landmark !== undefined);
    if (expected.has(b.id)) {
      assert.equal(detailed.length, 1, b.id);
      assert.equal(detailed[0]?.landmark, expected.get(b.id));
    } else assert.equal(detailed.length, 0, b.id);
    return detailed;
  });
  assert.equal(all.length, expected.size);
  assert.equal(new Set(all.map((s) => s.landmark)).size, expected.size);
});

test("textured landmarks keep their proportions and the street-facing boundary", async () => {
  const dream = await import("./dream.ts");
  assert.equal(typeof dream.landmarkPlacement, "function");
  for (const id of [
    "vesper-hotel",
    "bus-shelter-block",
    "mural-wall",
    "florist",
    "arcade-square",
    "pawn-gadgets",
  ]) {
    const b = BUILDINGS.find((b) => b.id === id);
    assert.ok(b);
    const spot = spots(b).find((s) => s.landmark !== undefined);
    assert.ok(spot);
    const p = dream.landmarkPlacement(spot);
    assert.equal(p.scale, Math.min(spot.sx, spot.sz));
    const oldFront = [
      spot.x + Math.sin(spot.yaw) * spot.sz * 8,
      spot.z + Math.cos(spot.yaw) * spot.sz * 8,
    ];
    const newFront = [
      p.x + Math.sin(spot.yaw) * p.scale * 8,
      p.z + Math.cos(spot.yaw) * p.scale * 8,
    ];
    assert.ok(
      Math.hypot(oldFront[0] - newFront[0], oldFront[1] - newFront[1]) < 1e-6,
      id,
    );
  }
});
