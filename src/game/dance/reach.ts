// A kiss between dolls of different heights: the shorter rises on their toes
// and lifts their chin, the taller bends their knees and bows their head, so
// the faces meet in the middle. Each side works out its half from the two face
// heights alone, so the two dolls on a screen agree on who does what. Pure.
import { bodyScales, type BodyShape } from "../body.ts";
import { modelSuffix, type Look } from "../look.ts";
import type { Joint, Pose } from "./moves.ts";

/** The face's height above the soles on each 3D doll at height scale 1 (meters,
 * measured in the doll lab's together shot). */
const FACE = { "": 1.5, "-m": 1.55 } as const;
/** How much further forward a man's face sits at the same lean (meters). */
const DEPTH = { "": 0, "-m": 0.03 } as const;
/** As high as a doll goes on tiptoe, and as low as their knees bend. */
const MAX_RISE = 0.05;
const MAX_DROP = 0.14;
/** Hip to sole, and ankle to the ball of the foot (meters). */
const LEG = 0.85;
const FOOT = 0.14;
/** The kisses' body lean standing close and at the kiss (moves.ts). */
const REST_LEAN = 0.03;
const KISS_LEAN = 0.12;

/** How far a doll's face sits above the floor. */
export const faceHeight = (look: Look, body: BodyShape): number =>
  FACE[modelSuffix(look)] * bodyScales(body).height;

/** How far a doll's face stands forward of a woman's at the same lean. */
export const faceDepth = (look: Look): number => DEPTH[modelSuffix(look)];

/** One side's share of making up a height difference, at the kiss. */
export type Reach = {
  /** Meters the knees bend the doll down. */
  drop: number;
  /** Meters up on tiptoe. */
  rise: number;
  /** Radians the head bows (lifts, below zero). */
  nod: number;
  /** Meters the doll stands back, so a face set further forward meets. */
  back: number;
};

/** The reach of a doll whose face is at `own` meters, kissing one at
 * `partner`, with its face `back` meters further forward than a woman's. */
export function reachFor(own: number, partner: number, back = 0): Reach {
  const d = Math.abs(own - partner);
  if (d === 0) return { drop: 0, rise: 0, nod: 0, back };
  // the shorter does half, up to tiptoe; the taller does the rest it can
  const rise = Math.min(d / 2, MAX_RISE);
  const drop = Math.min(d - rise, MAX_DROP);
  // a radian of bow for every meter of difference (a tenth of a meter gives
  // 0.1 rad), capped: the knees and toes close the gap, the head only aims
  const nod = Math.min(0.15, d);
  return own > partner
    ? { drop, rise: 0, nod, back }
    : { drop: 0, rise, nod: -nod, back };
}

const LEGS: readonly (readonly [Joint, Joint, Joint])[] = [
  ["lLeg", "lShin", "lFoot"],
  ["rLeg", "rShin", "rFoot"],
];

/** How far into the kiss a sampled kiss pose is: 0 standing close, 1 at it. */
export function leanIn(pose: Pose): number {
  const w = (pose.joints.body[0] - REST_LEAN) / (KISS_LEAN - REST_LEAN);
  return Math.min(1, Math.max(0, w));
}

/** Lays a reach onto a sampled pose in place, `w` of the way (0 to 1). */
export function applyReach(pose: Pose, r: Reach, w: number): void {
  if (w <= 0) return;
  const drop = r.drop * w;
  const rise = r.rise * w;
  // knees: thighs forward and shins back twice as far keep the feet under the
  // hips, and the feet tip back as far to stay flat
  const knee = Math.acos(1 - drop / LEG);
  // tiptoe: the heels come up as the feet point
  const toe = Math.asin(Math.min(1, rise / FOOT));
  pose.root[1] += rise - drop;
  pose.root[2] -= r.back * w;
  for (const [leg, shin, foot] of LEGS) {
    pose.joints[leg][0] -= knee;
    pose.joints[shin][0] += 2 * knee;
    pose.joints[foot][0] += toe - knee;
  }
  pose.joints.head[0] += r.nod * w;
}
