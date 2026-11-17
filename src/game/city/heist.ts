// A heist at City Trust on Main Avenue: the alarm goes off, three robbers run
// out to a getaway car at the curb, and squad cars come screaming down the
// avenue. Some heists the crew gets away and the police arrive to an empty
// curb, then head off after them; some the police box the car in and the
// robbers are walked to the squad cars. One heist in every 40-minute slot, at
// a different minute each time. Pure and deterministic on the clock, so every
// player sees the same heist.
import type { Vec2 } from "../walk.ts";
import { WEST_EDGE } from "./layout.ts";
import { hash } from "./hash.ts";

/** Seconds in each slot; one heist goes off somewhere inside every slot. */
export const HEIST_SLOT = 2400;
/** Seconds from the alarm to the last car leaving. */
export const HEIST_LENGTH = 130;
/** City Trust's front door, on its south wall facing Main Avenue. */
export const BANK_DOOR: Vec2 = [-165, -16];
/** Cars park with two wheels up on the avenue's north sidewalk, clear of
 * both traffic lanes; squad cars drive the center line, between them. */
export const CURB_Z = -8.5;
/** Where the cars come from and go to along Main Avenue. */
const EAST_END = 60;
const WEST_END = WEST_EDGE + 6;

export type HeistOutcome = "escape" | "caught";

/** Where one car or robber is: `yaw` in the traffic convention (0 faces +x,
 * the heading is (cos yaw, -sin yaw)), `speed` in m/s. */
export type HeistActor = {
  visible: boolean;
  x: number;
  z: number;
  yaw: number;
  speed: number;
};

export type HeistFrame = {
  outcome: HeistOutcome;
  /** The bank's alarm bell is ringing. */
  alarm: boolean;
  /** A squad car is racing in with its siren on. */
  siren: boolean;
  /** Some squad car has its light bar going. */
  lights: boolean;
  /** Each squad car's light bar: on arriving and parked, off driving away. */
  lit: boolean[];
  /** The robbers have been stopped and stand waiting with their heads down. */
  caught: boolean;
  cops: HeistActor[];
  getaway: HeistActor;
  robbers: HeistActor[];
};

type Ease = "linear" | "in" | "out";
/** One move along a path, from `t0` to `t1` seconds into the heist. */
type Leg = { t0: number; t1: number; path: readonly Vec2[]; ease: Ease };
/** Someone's whole part: shown from the first leg's start to the last's end. */
type Part = readonly Leg[];

export const COPS = 4;
export const ROBBERS = 3;

/** Seconds a car takes to straighten up as it pulls away from where it stood. */
const STRAIGHTEN = 1.2;

const arriveFromEast = (x: number, t0: number, t1: number): Leg => ({
  t0,
  t1,
  path: [
    [EAST_END, 0],
    [x + 12, 0],
    [x, CURB_Z],
  ],
  ease: "out",
});
const arriveFromWest = (x: number, t0: number, t1: number): Leg => ({
  t0,
  t1,
  path: [
    [WEST_END, 0],
    [x - 12, 0],
    [x, CURB_Z],
  ],
  ease: "out",
});
const leaveWest = (x: number, t0: number, t1: number): Leg => ({
  t0,
  t1,
  path: [
    [x, CURB_Z],
    [x - 12, 0],
    [WEST_END, 0],
  ],
  ease: "in",
});
const leaveEast = (x: number, t0: number, t1: number): Leg => ({
  t0,
  t1,
  path: [
    [x, CURB_Z],
    [x + 12, 0],
    [EAST_END, 0],
  ],
  ease: "in",
});

/** The getaway car waits at the curb west of the door. */
const GETAWAY_X = -186;
/** Robbers come out of the door one after another and run to the car. */
const robberRun = (k: number): Leg => ({
  t0: 4 + k * 0.6,
  t1: 8 + k * 0.6,
  path: [
    [BANK_DOOR[0], BANK_DOOR[1]],
    [BANK_DOOR[0] - 3, -12],
    [GETAWAY_X + 3, -11 - k * 0.4],
    [GETAWAY_X + 0.5 + k * 0.9, -10.6 - k * 0.5],
  ],
  ease: "linear",
});
/** Hold still where the last leg ended, until `t1`. */
const stay = (at: Vec2, t0: number, t1: number): Leg => ({
  t0,
  t1,
  path: [at, at],
  ease: "linear",
});
const end = (leg: Leg): Vec2 => leg.path[leg.path.length - 1];

const ESCAPE_COPS = [-150, -162, -174, -140];
const CAUGHT_COPS = [-152, -164, -176];
const CAUGHT_BLOCKER = -196;

/** Every part of an escape: the car pulls away before the police arrive,
 * they look the scene over, then head off west after it. */
const ESCAPE: { cops: Part[]; getaway: Part; robbers: Part[] } = {
  cops: ESCAPE_COPS.map((x, k) => {
    const arrive = arriveFromEast(x, 16 + k * 1.5, 27 + k * 1.5);
    return [
      arrive,
      stay(end(arrive), arrive.t1, 100 + k * 2),
      leaveWest(x, 100 + k * 2, 120 + k * 2),
    ];
  }),
  getaway: [stay([GETAWAY_X, CURB_Z], 0, 9.5), leaveWest(GETAWAY_X, 9.5, 22)],
  robbers: Array.from({ length: ROBBERS }, (_, k) => [robberRun(k)]),
};

/** Every part of a bust: one squad car noses in ahead of the getaway car,
 * three pull up behind, and the robbers are walked to the squad cars. */
const CAUGHT: { cops: Part[]; getaway: Part; robbers: Part[] } = {
  cops: [
    ...CAUGHT_COPS.map((x, k) => {
      const arrive = arriveFromEast(x, 5 + k, 13 + k);
      return [
        arrive,
        stay(end(arrive), arrive.t1, 100 + k * 3),
        leaveWest(x, 100 + k * 3, 120 + k * 3),
      ];
    }),
    (() => {
      const arrive = arriveFromWest(CAUGHT_BLOCKER, 3, 9);
      return [
        arrive,
        stay(end(arrive), arrive.t1, 92),
        leaveEast(CAUGHT_BLOCKER, 92, 108),
      ];
    })(),
  ],
  // impounded: driven off behind the squad cars
  getaway: [stay([GETAWAY_X, CURB_Z], 0, 110), leaveWest(GETAWAY_X, 110, 128)],
  robbers: Array.from({ length: ROBBERS }, (_, k) => {
    const run = robberRun(k);
    // robber k goes to the back door of squad car 2 - k
    const to: Vec2 = [CAUGHT_COPS[2 - k] + 1.5, -11];
    const from = end(run);
    const walk = Math.hypot(to[0] - from[0], to[1] - from[1]) / 1.4;
    return [
      run,
      stay(from, run.t1, 50),
      { t0: 50, t1: 50 + walk, path: [from, to], ease: "linear" },
    ];
  }),
};

const ALARM_ENDS: Record<HeistOutcome, number> = { escape: 90, caught: 60 };
/** From the robbers stopping at the boxed-in car to their walk away. */
const CAUGHT_FROM = 10;
const CAUGHT_UNTIL = 50;

function rand(n: number): number {
  return hash(n, 7.31);
}

/** Seconds into slot `slot` that its heist starts (a held preview clock
 * uses it too). */
export function heistOffset(slot: number): number {
  return Math.floor(rand(slot) * (HEIST_SLOT - HEIST_LENGTH));
}

/** When slot `slot`'s heist starts, in clock seconds. */
export function heistStart(slot: number): number {
  return slot * HEIST_SLOT + heistOffset(slot);
}

/** How slot `slot`'s heist ends. */
export function heistOutcome(slot: number): HeistOutcome {
  return hash(slot, 2.17) < 0.5 ? "escape" : "caught";
}

/** Seconds into the heist under way at `t`, or null when none is. */
export function heistInto(t: number): number | null {
  const into = t - heistStart(Math.floor(t / HEIST_SLOT));
  return into >= 0 && into < HEIST_LENGTH ? into : null;
}

/** Seconds until the next heist; 0 while one is under way. */
export function nextHeistIn(t: number): number {
  const slot = Math.floor(t / HEIST_SLOT);
  const start = heistStart(slot);
  if (t < start) return start - t;
  if (t < start + HEIST_LENGTH) return 0;
  return heistStart(slot + 1) - t;
}

const actor = (): HeistActor => ({
  visible: false,
  x: 0,
  z: 0,
  yaw: 0,
  speed: 0,
});

/** A frame to fill with heistFrame, reused every frame. */
export function blankHeist(): HeistFrame {
  return {
    outcome: "escape",
    alarm: false,
    siren: false,
    lights: false,
    caught: false,
    cops: Array.from({ length: COPS }, actor),
    lit: Array.from({ length: COPS }, () => false),
    getaway: actor(),
    robbers: Array.from({ length: ROBBERS }, actor),
  };
}

/** Eased progress 0..1 at `u` (0..1), and its rate of change. */
function eased(ease: Ease, u: number): [number, number] {
  if (ease === "in") return [u * u, 2 * u];
  if (ease === "out") return [1 - (1 - u) * (1 - u), 2 * (1 - u)];
  return [u, 1];
}

function pathLength(path: readonly Vec2[]): number {
  let length = 0;
  for (let i = 1; i < path.length; i++)
    length += Math.hypot(
      path[i][0] - path[i - 1][0],
      path[i][1] - path[i - 1][1],
    );
  return length;
}

/** Puts `out` at distance `d` along `path`, heading down the segment it is
 * on; the heading is NaN when the path has no length (standing still). */
function place(path: readonly Vec2[], d: number, out: HeistActor): void {
  let left = d;
  for (let i = 1; i < path.length; i++) {
    const [ax, az] = path[i - 1];
    const [bx, bz] = path[i];
    const seg = Math.hypot(bx - ax, bz - az);
    if (seg === 0) continue;
    if (left <= seg || i === path.length - 1) {
      const f = Math.min(1, left / seg);
      out.x = ax + (bx - ax) * f;
      out.z = az + (bz - az) * f;
      out.yaw = Math.atan2(-(bz - az), bx - ax);
      return;
    }
    left -= seg;
  }
  out.x = path[0][0];
  out.z = path[0][1];
  out.yaw = Number.NaN;
}

/** The heading a part holds at the end of leg `i` (looking back past legs
 * that stand still). */
function restingYaw(part: Part, i: number, scratch: HeistActor): number {
  for (let k = i; k >= 0; k--) {
    const leg = part[k];
    place(leg.path, pathLength(leg.path), scratch);
    if (!Number.isNaN(scratch.yaw)) return scratch.yaw;
  }
  // a part that never moves faces down the first leg's own path, or west
  return Math.PI;
}

/** The shorter way round from angle `a` to angle `b`, `f` of the way. */
function turn(a: number, b: number, f: number): number {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + d * f;
}

const scratch = actor();

/** Places `out` for `part` at `into` seconds; hides it outside its legs. */
function act(part: Part, into: number, out: HeistActor): void {
  const first = part[0];
  const last = part[part.length - 1];
  out.visible = into >= first.t0 && into < last.t1;
  out.speed = 0;
  if (!out.visible) return;
  for (let i = 0; i < part.length; i++) {
    const leg = part[i];
    if (into >= leg.t1) continue;
    const length = pathLength(leg.path);
    const dur = leg.t1 - leg.t0;
    const u = Math.max(0, (into - leg.t0) / dur);
    const [p, rate] = eased(leg.ease, u);
    place(leg.path, p * length, out);
    out.speed = length === 0 ? 0 : (rate * length) / dur;
    const held = i > 0 ? restingYaw(part, i - 1, scratch) : Number.NaN;
    if (Number.isNaN(out.yaw)) out.yaw = Number.isNaN(held) ? Math.PI : held;
    // pulling away from a stop, a car swings round to its new heading
    else if (!Number.isNaN(held) && into - leg.t0 < STRAIGHTEN)
      out.yaw = turn(held, out.yaw, (into - leg.t0) / STRAIGHTEN);
    return;
  }
}

/**
 * Fills `out` with the heist at clock time `t` and returns true, or hides
 * everyone and returns false between heists. Allocates nothing.
 */
export function heistFrame(t: number, out: HeistFrame): boolean {
  const slot = Math.floor(t / HEIST_SLOT);
  const into = heistInto(t);
  const outcome = heistOutcome(slot);
  out.outcome = outcome;
  const script = outcome === "escape" ? ESCAPE : CAUGHT;
  const at = into ?? -1;
  out.alarm = into !== null && at < ALARM_ENDS[outcome];
  out.caught = outcome === "caught" && at >= CAUGHT_FROM && at < CAUGHT_UNTIL;
  out.siren = false;
  out.lights = false;
  script.cops.forEach((part, k) => {
    const cop = out.cops[k];
    act(part, at, cop);
    out.lit[k] = cop.visible && at < part[part.length - 1].t0;
    if (cop.visible && at < part[0].t1) out.siren = true;
    if (out.lit[k]) out.lights = true;
  });
  act(script.getaway, at, out.getaway);
  script.robbers.forEach((part, k) => act(part, at, out.robbers[k]));
  return into !== null;
}
