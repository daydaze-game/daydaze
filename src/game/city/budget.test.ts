// The low tier's whole streamed city against the render budget: the plan
// with the architecture the low tier really draws, plus the street trees, the
// furniture and the park's undergrowth, each costed from its shipped GLB.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { CHAT_GROUPS, nearestChatGroups } from "./chatGroups.ts";
import { CHAT_DOLLS, CHAT_RADIUS } from "./tuning.ts";
import { CITY_SPAWN } from "./layout.ts";
import { DREAM_KINDS, DREAM_LANDMARKS, type DreamSpot } from "./dream.ts";
import { DREAM_LANDMARK_COST } from "./dreamLandmarkCosts.generated.ts";
import { DREAM_MODEL_COST } from "./dreamCosts.generated.ts";
import { dreamTriangles } from "./dreamCosts.ts";
import { QUEUE_LOOKS, QUEUE_PERSON_TRIS } from "./queues.ts";
import { CROWD_BAKES, CROWD_TRIS, crowdUrl } from "../crowd.ts";
import {
  worstViewDreamTriangles,
  BAYS_CAMERA,
  baysWanted,
  liveCost,
  lowTierCost,
  MODEL_COST,
  modelsInBudget,
  NPC_DOLL_TRIS,
  planView,
  SEASON_MODEL,
  trafficCost,
} from "./budget.ts";
import { BODY_KEYS, ROSTER_BODY } from "../driving/bodies.ts";
import type { Vec2 } from "../walk.ts";
import { vec2 } from "../typed.ts";

type Gltf = {
  meshes: {
    name?: string;
    primitives: { indices?: number; attributes: { POSITION: number } }[];
  }[];
  accessors: { count: number }[];
};
const isGltf = (v: unknown): v is Gltf =>
  typeof v === "object" &&
  v !== null &&
  "meshes" in v &&
  Array.isArray(v.meshes) &&
  "accessors" in v &&
  Array.isArray(v.accessors);

/** Triangles and primitives in a GLB, read from its JSON chunk. */
function glbCost(path: string, name?: string): { tris: number; parts: number } {
  const bytes = readFileSync(
    new URL(`../../../public/models/${path}.glb`, import.meta.url),
  );
  const length = bytes.readUInt32LE(12);
  const gltf: unknown = JSON.parse(bytes.subarray(20, 20 + length).toString());
  assert.ok(isGltf(gltf), path);
  let tris = 0;
  let parts = 0;
  for (const mesh of gltf.meshes) {
    if (name && mesh.name !== name) continue;
    for (const p of mesh.primitives) {
      parts += 1;
      const n = gltf.accessors[p.indices ?? p.attributes.POSITION]?.count ?? 0;
      tris += n / 3;
    }
  }
  return { tris: Math.round(tris), parts };
}

test("the budget's model costs match the shipped GLBs", () => {
  for (const path of modelsInBudget())
    assert.deepEqual(MODEL_COST[path], glbCost(path), path);
});

test("every dream family and its distant twin match generated costs and one draw call", () => {
  for (const kind of DREAM_KINDS)
    for (const far of [false, true]) {
      const name = `${kind}${far ? "-lo" : ""}`;
      assert.deepEqual(
        glbCost("city-dream/architecture", name),
        { tris: DREAM_MODEL_COST[kind][far ? "lo" : "tris"], parts: 1 },
        name,
      );
    }
});

test("the seasonal models' costs match the shipped GLBs", () => {
  for (const [path, cost] of Object.entries(SEASON_MODEL))
    assert.deepEqual(cost, glbCost(path), path);
});

/** A baked crowd file's path under public/models, as glbCost takes it. */
const crowdPath = (...a: Parameters<typeof crowdUrl>) =>
  crowdUrl(...a).replace(/^\/models\/(.*)\.glb$/, "$1");

test("every baked crowd person is one part, within its tier's triangles", () => {
  for (const { look, pose, tier } of CROWD_BAKES) {
    const cost = glbCost(crowdPath(look, pose, tier));
    assert.equal(cost.parts, 1, `${look}-${pose}-${tier}`);
    assert.ok(
      cost.tris <= CROWD_TRIS[tier],
      `${look}-${pose}-${tier}: ${cost.tris}`,
    );
  }
});

test("the queue people are no dearer than the budget says", () => {
  for (const look of QUEUE_LOOKS) {
    const cost = glbCost(crowdPath(look, "idle", "near"));
    assert.ok(cost.tris <= QUEUE_PERSON_TRIS, `${look}: ${cost.tris}`);
  }
});

test("wherever she stands, the low tier's city (architecture, trees, furniture, park) fits 250 draw calls and 300k triangles", () => {
  let worst = { tris: 0, at: vec2(0, 0) };
  for (let x = -432; x <= 432; x += 32)
    for (let z = -320; z <= 368; z += 32) {
      const at: Vec2 = [x, z];
      const cost = lowTierCost(at);
      assert.ok(cost.drawCalls <= 250, `${cost.drawCalls} draw calls at ${at}`);
      if (cost.triangles > worst.tris) worst = { tris: cost.triangles, at };
    }
  // the park, where the undergrowth is thickest
  const park = lowTierCost([228, -292]);
  assert.ok(
    park.triangles < 300_000,
    `${park.triangles} triangles in the park`,
  );
  assert.ok(worst.tris < 300_000, `${worst.tris} triangles at ${worst.at}`);
});

test("pulled out to the overview, the low tier draws distant architecture and yards and still fits", () => {
  let worst = { tris: 0, at: vec2(0, 0) };
  for (let x = -432; x <= 432; x += 48)
    for (let z = -320; z <= 368; z += 48) {
      const at: Vec2 = [x, z];
      const cost = lowTierCost(at, false);
      assert.ok(cost.drawCalls <= 250, `${cost.drawCalls} draw calls at ${at}`);
      if (cost.triangles > worst.tris) worst = { tris: cost.triangles, at };
    }
  assert.ok(worst.tris < 300_000, `${worst.tris} triangles at ${worst.at}`);
  // Sculpted architecture remains present in the overview.
  assert.ok(lowTierCost(CITY_SPAWN.position, false).planTriangles > 0);
});

test("the low tier's cost counts its dream architecture", () => {
  const at = CITY_SPAWN.position;
  const cost = lowTierCost(at);
  assert.ok(cost.parts.dream > 0);
  assert.ok(cost.triangles > cost.planTriangles);
});

test("overview prices all architecture around the player for its distant camera", () => {
  const at = CITY_SPAWN.position;
  const plan = planView(at, "low", false);
  const all = plan.dream.reduce((n, s) => n + dreamTriangles(s), 0);
  assert.equal(lowTierCost(at, false).parts.dream, all);
});

test("the bays come in as the camera nears her and go as it pulls out to the overview, without flicker between", () => {
  // the overview (about 255 m out) and a street view
  assert.equal(baysWanted(255, true), false);
  assert.equal(baysWanted(30, false), true);
  // between the two edges it keeps what it had
  const mid = (BAYS_CAMERA.on + BAYS_CAMERA.off) / 2;
  assert.equal(baysWanted(mid, true), true);
  assert.equal(baysWanted(mid, false), false);
  assert.ok(BAYS_CAMERA.on < BAYS_CAMERA.off);
});

test("street-food downloads and nearby vendor costumes are included in the budget", () => {
  for (const model of [
    "vendors/truck",
    "vendors/cart",
    "doll/body",
    "doll/hair-bob",
    "doll/outfit-jeans",
    "doll/shoes-platforms",
  ]) {
    assert.ok(modelsInBudget().includes(model), model);
    assert.deepEqual(MODEL_COST[model], glbCost(model), model);
  }
  for (const at of [
    [254, -270],
    [246, -267.4],
    [262, -267.4],
    [-18, 15.6],
    [20, 15.6],
  ] satisfies Vec2[]) {
    const cost = lowTierCost(at);
    assert.ok(cost.triangles < 300_000, `${cost.triangles} at ${at}`);
    assert.ok(cost.drawCalls < 250);
  }
});

test("the park's zoomed-out view prices its walkers, wildlife and dogs, and still fits with headroom", () => {
  // the street-food stop, where the camera pulled out sees the whole lawn
  const at: Vec2 = [254, -264];
  const priced: string[] = [];
  const live = liveCost(at, (model) => priced.push(model));
  assert.ok(live.triangles > 0, "walkers and the crowd are priced");
  for (const kind of ["deer", "rabbit", "fox", "labrador", "husky", "shibainu"])
    assert.ok(priced.includes(`animals/${kind}`), `${kind} is priced`);
  // the band shell stands 24 m away: its stage, chairs, instruments and band
  for (const model of ["park/band-shell", "park/lawn-chair", "park/band-stand"])
    assert.ok(priced.includes(model), `${model} is priced`);
  const cost = lowTierCost(at);
  assert.ok(
    cost.triangles >=
      (cost.parts.plan ?? 0) + (cost.parts.dream ?? 0) + live.triangles,
    "the total includes the live people and animals",
  );
  assert.ok(cost.triangles < 295_000, `${cost.triangles} triangles`);
  assert.ok(cost.drawCalls < 250, `${cost.drawCalls} draw calls`);
});

test("the plan's densest street keeps headroom under the budget", () => {
  const cost = lowTierCost([-144, 0]);
  assert.ok(cost.triangles < 295_000, `${cost.triangles} triangles`);
});

test("traffic is priced from the shipped car bodies, more on a road than on a lawn", () => {
  // every body (near for the player's car, -lo for traffic) is in the budget
  for (const key of BODY_KEYS)
    for (const path of [`cars/${key}`, `cars/${key}-lo`])
      assert.ok(modelsInBudget().includes(path), path);
  // a distance twin is under 1,500 triangles, a near model under 6,000
  for (const key of BODY_KEYS) {
    assert.ok(MODEL_COST[`cars/${key}-lo`].tris <= 1500, key);
    assert.ok(MODEL_COST[`cars/${key}`].tris <= 6000, key);
  }
  const lawn: Vec2 = [254, -264];
  const crossing: Vec2 = [-144, 0];
  const onLawn = trafficCost(lawn);
  const onRoad = trafficCost(crossing);
  assert.ok(onRoad.triangles > onLawn.triangles);
  // at the wheel: the dearest road car's near model is in the road price
  const dearestOwn = Math.max(
    ...Object.values(ROSTER_BODY).map((k) => MODEL_COST[`cars/${k}`].tris),
  );
  assert.ok(onRoad.triangles >= dearestOwn);
  assert.ok(onLawn.triangles < dearestOwn);
});

test("the park gate, the dearest low-tier view, stays at or under 270k triangles", () => {
  const gate = lowTierCost([254, -270]);
  assert.ok(gate.triangles <= 270_000, `${gate.triangles} triangles`);
  assert.ok(gate.drawCalls <= 235, `${gate.drawCalls} draw calls`);
  // and every spot around it, on a fine grid (the dearest is a step off the gate)
  for (let x = 200; x <= 300; x += 8)
    for (let z = -320; z <= -230; z += 8) {
      const { triangles } = lowTierCost([x, z]);
      assert.ok(triangles <= 270_000, `${triangles} triangles at ${x},${z}`);
    }
});

test("the sidewalk chat dolls are priced at the spawn, and none stand near the dearest views", () => {
  const people = nearestChatGroups(
    CITY_SPAWN.position,
    CHAT_RADIUS.low,
    CHAT_DOLLS.low,
  ).reduce((n, i) => n + (CHAT_GROUPS[i]?.looks.length ?? 0), 0);
  assert.ok(people >= 2 && people <= CHAT_DOLLS.low);
  const live = liveCost(CITY_SPAWN.position, () => {});
  assert.ok(live.triangles >= people * NPC_DOLL_TRIS, `${live.triangles}`);
  assert.ok(live.drawCalls >= people * 6);
  // the park gate and the park itself (the worst low-tier views) have no chat
  // dolls to add: the low tier draws groups only within CHAT_RADIUS.low and none are that near
  for (const at of [
    [254, -270],
    [228, -292],
  ] as const)
    assert.deepEqual(nearestChatGroups(at, CHAT_RADIUS.low, 5), [], `${at}`);
});

test("textured landmarks are priced from their shipped near and far meshes", () => {
  for (const kind of DREAM_LANDMARKS)
    for (const far of [false, true]) {
      const cost = DREAM_LANDMARK_COST[kind];
      const actual = glbCost(`city-dream/${kind}${far ? "-lo" : ""}`);
      assert.deepEqual(
        actual,
        {
          tris: far ? cost.lo : cost.tris,
          parts: far ? cost.loParts : cost.parts,
        },
        kind,
      );
    }
  // A one-off model replaces its base family, rather than adding both costs.
  const spot: DreamSpot = {
    id: "test",
    kind: "palazzo",
    landmark: "palace",
    far: false,
    x: 0,
    y: 0,
    z: 0,
    sx: 1,
    sy: 1,
    sz: 1,
    yaw: 0,
    color: "#ffffff",
  };
  assert.equal(
    worstViewDreamTriangles([spot], [0, 0]),
    DREAM_LANDMARK_COST.palace.tris,
  );
});

test("distant landmark roofs retain the detailed skyline height", () => {
  const raw: unknown = JSON.parse(
    readFileSync(
      new URL(
        "../../../public/models/city-dream/landmarks.generated.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  type Detail = { bounds: { max: number[] } };
  type Entry = { near: Detail; far: Detail };
  const isDetail = (v: unknown): v is Detail =>
    typeof v === "object" &&
    v !== null &&
    "bounds" in v &&
    typeof v.bounds === "object" &&
    v.bounds !== null &&
    "max" in v.bounds &&
    Array.isArray(v.bounds.max);
  const isEntry = (v: unknown): v is Entry =>
    typeof v === "object" &&
    v !== null &&
    "near" in v &&
    isDetail(v.near) &&
    "far" in v &&
    isDetail(v.far);
  assert.ok(typeof raw === "object" && raw !== null);
  const metadata = new Map<string, unknown>(Object.entries(raw));
  for (const kind of DREAM_LANDMARKS) {
    const entry = metadata.get(kind);
    assert.ok(isEntry(entry), kind);
    assert.ok(
      Math.abs(entry.near.bounds.max[1] - entry.far.bounds.max[1]) < 0.3,
      `${kind} loses its roof or spire when switching detail`,
    );
  }
});
