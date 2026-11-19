// Named city spots for the ?spot=<building-id> flag and the screenshot tour:
// where to stand to show off one building. A building with a door gets a spot
// just outside the door's trigger, out from the building; a doorless one gets
// a spot on the sidewalk of its nearest road. Either way she stands with her
// back to the building: the "full" camera stands in front of her and looks
// back (CameraRig's CLOSE), so the building fills the frame behind her.
import type { Spawn } from "../rooms.ts";
import { yawTowards, type Vec2 } from "../walk.ts";
import { isBlocked } from "../area.ts";
import {
  BUILDINGS,
  CITY_AREA,
  PROPS,
  ROAD_EDGES,
  ROAD_NODES,
} from "./layout.ts";
import { FURNITURE, PARKED_CARS } from "./dressing.ts";

/** Meters past the door's trigger radius, so no enter prompt shows. */
const DOOR_GAP = 2;
/** Meters from the road's edge onto the sidewalk. */
const KERB_GAP = 1.5;

const nodes = new Map(ROAD_NODES.map((n) => [n.id, n.position]));

type Obstacle = { at: Vec2; r: number };

const THINGS: readonly Obstacle[] = [
  ...FURNITURE.map((f): Obstacle => ({ at: [f.x, f.z], r: 1.5 })),
  ...PROPS.map((p): Obstacle => ({
    at: [p.position[0], p.position[1]],
    r: 1.5,
  })),
  ...PARKED_CARS.map((c): Obstacle => ({ at: [c.x, c.z], r: 2.0 })),
];

/** Where the full-look camera stands relative to the player (CameraRig's CLOSE). */
const cameraFor = (pos: Vec2, yaw: number): Vec2 => [
  pos[0] + 0.6 * Math.cos(yaw) + 4.1 * Math.sin(yaw),
  pos[1] - 0.6 * Math.sin(yaw) + 4.1 * Math.cos(yaw),
];

function isClear(pos: Vec2, yaw: number): boolean {
  if (isBlocked(CITY_AREA, pos)) return false;
  const cam = cameraFor(pos, yaw);
  if (isBlocked(CITY_AREA, cam)) return false;
  const mid: Vec2 = [(pos[0] + cam[0]) / 2, (pos[1] + cam[1]) / 2];
  for (const t of THINGS) {
    if (Math.hypot(t.at[0] - pos[0], t.at[1] - pos[1]) < t.r) return false;
    if (Math.hypot(t.at[0] - cam[0], t.at[1] - cam[1]) < t.r) return false;
    if (Math.hypot(t.at[0] - mid[0], t.at[1] - mid[1]) < t.r) return false;
  }
  return true;
}

const SIDE_NUDGES = [0, 1.5, -1.5, 3.0, -3.0, 4.5, -4.5] as const;
const FWD_NUDGES = [0, 1.0, -1.0, 2.0] as const;

function clearSpot(base: Vec2, yaw: number): Vec2 {
  if (isClear(base, yaw)) return base;
  const right: Vec2 = [Math.cos(yaw), -Math.sin(yaw)];
  const fwd: Vec2 = [Math.sin(yaw), Math.cos(yaw)];
  for (const f of FWD_NUDGES) {
    for (const s of SIDE_NUDGES) {
      if (f === 0 && s === 0) continue;
      const cand: Vec2 = [
        base[0] + right[0] * s + fwd[0] * f,
        base[1] + right[1] * s + fwd[1] * f,
      ];
      if (isClear(cand, yaw)) return cand;
    }
  }
  return base;
}

/** The closest point on segment a-b to p. */
function closestOn(p: Vec2, a: Vec2, b: Vec2): Vec2 {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const len2 = dx * dx + dz * dz;
  const t =
    len2 === 0
      ? 0
      : Math.min(
          1,
          Math.max(0, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / len2),
        );
  return [a[0] + t * dx, a[1] + t * dz];
}

/** `from` moved `meters` toward (or, negative, away from) `to`. */
function step(from: Vec2, to: Vec2, meters: number): Vec2 {
  const d = Math.hypot(to[0] - from[0], to[1] - from[1]);
  // no direction (a door on the centroid): step along -z, so "away" is +z
  if (d === 0) return [from[0], from[1] - meters];
  return [
    from[0] + ((to[0] - from[0]) / d) * meters,
    from[1] + ((to[1] - from[1]) / d) * meters,
  ];
}

/** Facing from `from` away from `to`. */
const awayFrom = (from: Vec2, to: Vec2) =>
  yawTowards(from, [2 * from[0] - to[0], 2 * from[1] - to[1]]);

/** Where to stand to show a building, or null for an unknown id. */
export function spotFor(id: string): Spawn | null {
  const b = BUILDINGS.find((x) => x.id === id);
  if (!b) return null;
  const n = b.footprint.length;
  const center: Vec2 = [
    b.footprint.reduce((s, p) => s + p[0], 0) / n,
    b.footprint.reduce((s, p) => s + p[1], 0) / n,
  ];
  if (b.door) {
    const door = b.door.position;
    const base = step(door, center, -(b.door.radius + DOOR_GAP));
    const position = clearSpot(base, awayFrom(base, door));
    return { position, yaw: awayFrom(position, door) };
  }
  // the nearest road centerline, then back onto its sidewalk
  let best: { at: Vec2; width: number; d: number } | null = null;
  for (const e of ROAD_EDGES) {
    const a = nodes.get(e.from);
    const z = nodes.get(e.to);
    if (!a || !z) continue;
    const at = closestOn(center, a, z);
    const d = Math.hypot(at[0] - center[0], at[1] - center[1]);
    if (!best || d < best.d) best = { at, width: e.width, d };
  }
  // no roads at all: stand 20 m south (+z) of the building
  const base: Vec2 = best
    ? step(best.at, center, best.width / 2 + KERB_GAP)
    : [center[0], center[1] + 20];
  const position = clearSpot(base, awayFrom(base, center));
  return { position, yaw: awayFrom(position, center) };
}
