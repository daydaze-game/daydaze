// A high-speed police chase through downtown: a fleeing sports car pursued
// by three squad cars with sirens screaming and light bars flashing, ending
// in a crash and box-in. One chase in every 40-minute slot, at a different
// minute each time, timed so it never clashes with the bank heist. Pure and
// deterministic on the clock.
import type { Vec2 } from "../walk.ts";
import { secondsSince } from "../clock.ts";
import { hash } from "./hash.ts";
import { heistOffset } from "./heist.ts";
import { ROAD_NODES } from "./layout.ts";
import { routeLength, routePose } from "./taxi.ts";

/** Seconds in each slot; one chase goes off somewhere inside every slot. */
export const CHASE_SLOT = 2400;
/** Seconds from chase start to cars clearing out after the crash. */
export const CHASE_LENGTH = 75;
/** Pursuing police squad cars. */
export const CHASE_COPS = 3;
/** Chase driving speed in m/s (~86 km/h, ignoring downtown limits). */
export const CHASE_SPEED = 24;
/** Trailing distance in meters between cars during pursuit. */
export const COP_TRAIL = 12;

export type ChaseActor = {
  visible: boolean;
  x: number;
  z: number;
  yaw: number;
  speed: number;
};

export type ChaseRoute = {
  id: string;
  name: string;
  nodes: readonly string[];
  points: readonly Vec2[];
  length: number;
  crashTime: number;
  crashPos: Vec2;
  crashYaw: number;
};

export type ChaseFrame = {
  slot: number;
  into: number;
  active: boolean;
  crashed: boolean;
  crashTime: number;
  crashPos: Vec2;
  siren: boolean;
  lights: boolean;
  lit: boolean[];
  fleeing: ChaseActor;
  fleeingColor: string;
  cops: ChaseActor[];
};

const nodeMap = new Map(ROAD_NODES.map((n) => [n.id, n.position]));

function buildRoute(
  id: string,
  name: string,
  nodes: readonly string[],
): ChaseRoute {
  const points: Vec2[] = nodes.map((nid) => {
    const p = nodeMap.get(nid);
    if (!p) throw new Error(`unknown node ${nid} in chase route ${id}`);
    return p;
  });
  const length = routeLength(points);
  const crashTime = length / CHASE_SPEED;
  const endPose = routePose(points, length);
  // Skid slightly off-center into the curb with angle
  const crashPos: Vec2 = [
    endPose.x + Math.cos(endPose.yaw) * 2.5 - Math.sin(endPose.yaw) * 2,
    endPose.z - Math.sin(endPose.yaw) * 2.5 - Math.cos(endPose.yaw) * 2,
  ];
  const crashYaw = endPose.yaw + 0.45;
  return {
    id,
    name,
    nodes,
    points,
    length,
    crashTime,
    crashPos,
    crashYaw,
  };
}

export const CHASE_ROUTES: readonly ChaseRoute[] = [
  buildRoute("main-ave-arts", "Main Ave to Arts District", [
    "west",
    "a-mid",
    "b-mid",
    "b-north",
    "b-arts",
    "a-arts",
  ]),
  buildRoute("gallery-to-main", "Gallery Row to Main Ave", [
    "arts-e",
    "b-arts",
    "a-arts",
    "a-north",
    "a-mid",
    "b-mid",
  ]),
  buildRoute("east-main-to-arts", "East Main to Arts North", [
    "east",
    "b-mid",
    "a-mid",
    "a-north",
    "a-arts",
  ]),
  buildRoute("arts-loop-south", "Arts Loop to Beachside", [
    "arts-w",
    "a-arts",
    "a-north",
    "a-mid",
    "b-mid",
    "b-south",
  ]),
];

export const FLEEING_COLORS = [
  "#d62828",
  "#1a1a24",
  "#e65100",
  "#1b3a4b",
  "#5a189a",
] as const;

/** Seconds into slot `slot` that its chase starts. */
export function chaseOffset(slot: number): number {
  const hOffset = heistOffset(slot);
  const half = CHASE_SLOT / 2; // 1200
  if (hOffset < half) {
    const startWindow = 1400;
    const windowSpan = CHASE_SLOT - CHASE_LENGTH - startWindow;
    return Math.floor(startWindow + hash(slot, 9.43) * windowSpan);
  }
  const windowSpan = 825;
  return Math.floor(hash(slot, 9.43) * windowSpan);
}

/** When slot `slot`'s chase starts, in clock seconds. */
export function chaseStart(slot: number): number {
  return slot * CHASE_SLOT + chaseOffset(slot);
}

/** Seconds into the chase under way at `t`, or null when none is. */
export function chaseInto(t: number): number | null {
  const slot = Math.floor(t / CHASE_SLOT);
  const into = secondsSince(t, chaseStart(slot));
  return into >= 0 && into < CHASE_LENGTH ? into : null;
}

/** Seconds until the next chase; 0 while one is under way. */
export function nextChaseIn(t: number): number {
  const slot = Math.floor(t / CHASE_SLOT);
  const start = chaseStart(slot);
  if (t < start) return start - t;
  if (t < start + CHASE_LENGTH) return 0;
  return chaseStart(slot + 1) - t;
}

/** The downtown route for slot `slot`. */
export function chaseRouteFor(slot: number): ChaseRoute {
  const idx = Math.floor(hash(slot, 3.14) * CHASE_ROUTES.length);
  return CHASE_ROUTES[idx] ?? CHASE_ROUTES[0];
}

/** The paint color for the fleeing car in slot `slot`. */
export function fleeingColorFor(slot: number): string {
  const idx = Math.floor(hash(slot, 8.19) * FLEEING_COLORS.length);
  return FLEEING_COLORS[idx] ?? FLEEING_COLORS[0];
}

const actor = (): ChaseActor => ({
  visible: false,
  x: 0,
  z: 0,
  yaw: 0,
  speed: 0,
});

/** A frame to fill with chaseFrame, reused every frame without allocations. */
export function blankChase(): ChaseFrame {
  return {
    slot: 0,
    into: -1,
    active: false,
    crashed: false,
    crashTime: 0,
    crashPos: [0, 0],
    siren: false,
    lights: false,
    lit: Array.from({ length: CHASE_COPS }, () => false),
    fleeing: actor(),
    fleeingColor: FLEEING_COLORS[0],
    cops: Array.from({ length: CHASE_COPS }, actor),
  };
}

const COP_BOX_OFFSETS = [0.25, -0.25, 0.1] as const;

/**
 * Fills `out` with the chase at clock time `t` and returns true, or hides
 * all cars and returns false outside chase times. Allocates nothing.
 */
export function chaseFrame(t: number, out: ChaseFrame): boolean {
  const slot = Math.floor(t / CHASE_SLOT);
  const into = chaseInto(t);
  out.slot = slot;
  out.into = into ?? -1;
  const active = into !== null;
  out.active = active;

  if (!active) {
    out.crashed = false;
    out.siren = false;
    out.lights = false;
    out.fleeing.visible = false;
    out.fleeing.speed = 0;
    for (let k = 0; k < CHASE_COPS; k++) {
      out.cops[k].visible = false;
      out.cops[k].speed = 0;
      out.lit[k] = false;
    }
    return false;
  }

  const route = chaseRouteFor(slot);
  out.crashTime = route.crashTime;
  out.crashPos = route.crashPos;
  out.fleeingColor = fleeingColorFor(slot);

  const at = into;
  const crashed = at >= route.crashTime;
  out.crashed = crashed;
  out.siren = true;
  out.lights = true;

  // Fleeing car position and speed
  const fleeing = out.fleeing;
  fleeing.visible = true;
  if (crashed) {
    fleeing.x = route.crashPos[0];
    fleeing.z = route.crashPos[1];
    fleeing.yaw = route.crashYaw;
    fleeing.speed = 0;
  } else {
    const d = at * CHASE_SPEED;
    const pose = routePose(route.points, d);
    fleeing.x = pose.x;
    fleeing.z = pose.z;
    fleeing.yaw = pose.yaw;
    fleeing.speed = CHASE_SPEED;
  }

  // Pursuing squad cars
  for (let k = 0; k < CHASE_COPS; k++) {
    const cop = out.cops[k];
    cop.visible = true;
    out.lit[k] = true;

    const stopDistance = Math.max(0, route.length - (k * 10 + 6));
    const driveDistance = at * CHASE_SPEED - (k + 1) * COP_TRAIL;
    const stopped = driveDistance >= stopDistance;

    if (stopped) {
      const pose = routePose(route.points, stopDistance);
      cop.x = pose.x;
      cop.z = pose.z;
      cop.yaw = pose.yaw + COP_BOX_OFFSETS[k];
      cop.speed = 0;
    } else {
      const d = Math.max(0, driveDistance);
      const pose = routePose(route.points, d);
      cop.x = pose.x;
      cop.z = pose.z;
      cop.yaw = pose.yaw;
      cop.speed = CHASE_SPEED;
    }
  }

  return true;
}
