// Cars and people: how far a braking car runs before it stops, what a car
// does to a person at a given speed (a stumble, a knockdown, a hard fall; the
// game is 13+, so always a get-up after, never an injury), how much the car
// slows on contact, and when driving off from a hit is a hit-and-run.
// Pure; traffic.ts brakes with it, the client plays the outcome.

import type { ReactionId } from "../reactions.ts";
import type { Vec2 } from "../walk.ts";

/** Seconds from a driver seeing someone to the brakes biting. */
export const DRIVER_REACTION = 0.8;
/** A full emergency stop, m/s² (about 0.7 g on dry asphalt). */
export const HARD_BRAKE = 7;

/**
 * Meters a car at `speed` (m/s) runs from the moment its driver sees
 * trouble: the reaction distance, then v²/2a under hard braking. About 12 m
 * at 30 km/h and 33 m at 60 km/h.
 */
export function stoppingDistance(speed: number): number {
  if (!(speed > 0)) return 0;
  return speed * DRIVER_REACTION + (speed * speed) / (2 * HARD_BRAKE);
}

/** What a car does to a person, by its speed at contact. */
export type HitOutcome = "bump" | "knockdown" | "hard-fall";

/** Slower than this (m/s) is no hit: a nudge she walks off. */
export const MIN_HIT_SPEED = 0.5;
/** Up to this (about 11 km/h) is a bump and a stumble. */
export const BUMP_BELOW = 3;
/** From this (about 40 km/h) she is thrown down hard. */
export const HARD_FROM = 11;

/** The outcome of a hit at `speed` m/s (either way, so reversing counts),
 * or null for none. */
export function hitOutcome(speed: number): HitOutcome | null {
  const v = Math.abs(speed);
  if (!(v >= MIN_HIT_SPEED)) return null;
  if (v < BUMP_BELOW) return "bump";
  return v < HARD_FROM ? "knockdown" : "hard-fall";
}

const REACTION_OF: Readonly<Record<HitOutcome, ReactionId>> = {
  bump: "stumble",
  knockdown: "trip-fall",
  // thrown, she lands hard on hands and knees and rises: the clip is its
  // own get-up
  "hard-fall": "hard-landing",
};

/** The reaction (game/reactions.ts) an outcome plays; each ends with her back
 * on her feet. */
export const hitReaction = (o: HitOutcome): ReactionId => REACTION_OF[o];

/** Meters she is thrown along the car's way: a step for a bump, a few meters
 * for a fast car, never past 8. */
export function knockback(speed: number): number {
  const v = Math.abs(speed);
  const o = hitOutcome(v);
  if (!o) return 0;
  if (o === "bump") return 0.4 + 0.1 * v;
  return Math.min(8, (o === "knockdown" ? 1 : 2) + 0.22 * v);
}

/** The share of its speed a car keeps through a person: the hit and the
 * driver's stamp on the brake take the rest. */
const KEPT = 0.35;

/** The car's speed just after hitting someone at `speed`, same direction. */
export function carSpeedAfterHit(speed: number): number {
  return Number.isFinite(speed) ? speed * KEPT : 0;
}

// ------------------------------------------------------------- hit-and-run

/** Driving this far from where you hit someone ... */
export const HIT_AND_RUN_RADIUS = 18;
/** ... within this many seconds of the hit is a hit-and-run. */
export const HIT_AND_RUN_SECONDS = 6;

/** A hit the player's car made: where, and the seconds since. */
export type HitScene = { at: Vec2; t: number };

export const openHitScene = (at: Vec2): HitScene => ({
  at: [at[0], at[1]],
  t: 0,
});

/**
 * Advances a hit scene by `dt` with the car at `car`. Returns the scene, or
 * null once it is over (the window passed, or the driver ran), and whether
 * this step made it a hit-and-run.
 */
export function stepHitScene(
  scene: HitScene,
  dt: number,
  car: Vec2,
): { scene: HitScene | null; hitAndRun: boolean } {
  const t = scene.t + (dt > 0 ? dt : 0);
  if (t > HIT_AND_RUN_SECONDS) return { scene: null, hitAndRun: false };
  const away = Math.hypot(car[0] - scene.at[0], car[1] - scene.at[1]);
  if (away > HIT_AND_RUN_RADIUS) return { scene: null, hitAndRun: true };
  scene.t = t;
  return { scene, hitAndRun: false };
}
