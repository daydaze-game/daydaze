// Named city spots for the ?spot=<building-id> flag and the screenshot tour:
// where to stand to show off one building. A building with a door gets a spot
// just outside the door's trigger, out from the building; a doorless one gets
// a spot on the sidewalk of its nearest road. Either way she stands with her
// back to the building: the "full" camera stands in front of her and looks
// back (CameraRig's CLOSE), so the building fills the frame behind her.
import type { Spawn } from "../rooms.ts";
import { yawTowards, type Vec2 } from "../walk.ts";
import { BUILDINGS, ROAD_EDGES, ROAD_NODES } from "./layout.ts";

/** Meters past the door's trigger radius, so no enter prompt shows. */
const DOOR_GAP = 2;
/** Meters from the road's edge onto the sidewalk. */
const KERB_GAP = 1.5;

const nodes = new Map(ROAD_NODES.map((n) => [n.id, n.position]));

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
    const position = step(door, center, -(b.door.radius + DOOR_GAP));
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
  const position: Vec2 = best
    ? step(best.at, center, best.width / 2 + KERB_GAP)
    : [center[0], center[1] + 20];
  return { position, yaw: awayFrom(position, center) };
}
