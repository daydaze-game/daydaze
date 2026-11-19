// Car tuning: engine, grip and nitrous levels as modifiers on a CarSpec. An
// untuned car gets its own spec back, so stepCar is unchanged for it. Pure.
import type { CarSpec } from "./car.ts";

export type TunePart = "engine" | "grip" | "nitrous";
export type Tuning = { engine: number; grip: number; nitrous: number };
/** Nitrous tank, in seconds of burn left. */
export type NitrousState = { fuel: number };

export const TUNE_PARTS: readonly TunePart[] = ["engine", "grip", "nitrous"];
export const MAX_TUNE_LEVEL = 5;
export const UNTUNED: Tuning = { engine: 0, grip: 0, nitrous: 0 };

/** XP an upgrade is worth (feeds Street). Data for the progression wiring. */
export const TUNE_XP = { upgrade: 20 } as const;

const ENGINE_SPEED_PER_LEVEL = 0.03;
const ENGINE_ACCEL_PER_LEVEL = 0.06;
const GRIP_PER_LEVEL = 0.03;
const NITROUS_BASE_SECONDS = 1.5;
const NITROUS_SECONDS_PER_LEVEL = 1;
const NITROUS_REFILL_PER_SECOND = 0.25; // of a second of burn per second
const BOOST_ACCEL = 1.5;
const BOOST_TOP_SPEED = 1.15;
const COST_BASE: Record<TunePart, number> = {
  engine: 150,
  grip: 100,
  nitrous: 200,
};

export function tuneCost(part: TunePart, nextLevel: number): number {
  return COST_BASE[part] * nextLevel;
}

function level(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(MAX_TUNE_LEVEL, Math.max(0, Math.floor(value)))
    : 0;
}

/** Validates untrusted (saved) tuning: whole levels clamped to 0..MAX_TUNE_LEVEL. */
export function cleanTuning(raw: unknown): Tuning {
  if (typeof raw !== "object" || raw === null) return { ...UNTUNED };
  const r: Record<string, unknown> = { ...raw };
  return {
    engine: level(r.engine),
    grip: level(r.grip),
    nitrous: level(r.nitrous),
  };
}

/** The spec with tuning applied; the same object when nothing is tuned. */
export function tunedSpec(spec: CarSpec, tuning: Tuning): CarSpec {
  const { engine, grip } = cleanTuning(tuning);
  if (engine === 0 && grip === 0) return spec;
  return {
    ...spec,
    topSpeed: spec.topSpeed * (1 + ENGINE_SPEED_PER_LEVEL * engine),
    accel: spec.accel * (1 + ENGINE_ACCEL_PER_LEVEL * engine),
    grip: Math.min(1, spec.grip + GRIP_PER_LEVEL * grip),
  };
}

export type UpgradeResult =
  | { ok: true; tuning: Tuning; coins: number; xp: number }
  | { ok: false; reason: "maxed" | "poor" };

/** Buys the next level of a part. */
export function upgrade(
  tuning: Tuning,
  part: TunePart,
  coins: number,
): UpgradeResult {
  const t = cleanTuning(tuning);
  if (t[part] >= MAX_TUNE_LEVEL) return { ok: false, reason: "maxed" };
  const cost = tuneCost(part, t[part] + 1);
  if (!(coins >= cost)) return { ok: false, reason: "poor" };
  return {
    ok: true,
    tuning: { ...t, [part]: t[part] + 1 },
    coins: coins - cost,
    xp: TUNE_XP.upgrade,
  };
}

/** Full tank in seconds of burn; 0 without the nitrous part. */
export function nitrousSeconds(tuning: Tuning): number {
  const n = cleanTuning(tuning).nitrous;
  return n === 0 ? 0 : NITROUS_BASE_SECONDS + NITROUS_SECONDS_PER_LEVEL * n;
}

/** One frame of tank: burns while pressed and not empty, refills slowly otherwise. */
export function stepNitrous(
  tuning: Tuning,
  state: NitrousState,
  pressed: boolean,
  dt: number,
): { fuel: number; burning: boolean } {
  const full = nitrousSeconds(tuning);
  const fuel = Math.min(full, Math.max(0, state.fuel));
  if (full === 0 || !(dt > 0)) return { fuel, burning: false };
  if (pressed && fuel > 0)
    return { fuel: Math.max(0, fuel - dt), burning: true };
  if (pressed) return { fuel: 0, burning: false };
  return {
    fuel: Math.min(full, fuel + NITROUS_REFILL_PER_SECOND * dt),
    burning: false,
  };
}

/** The spec to pass stepCar while nitrous burns; the same object when it doesn't. */
export function boostedSpec(spec: CarSpec, burning: boolean): CarSpec {
  if (!burning) return spec;
  return {
    ...spec,
    accel: spec.accel * BOOST_ACCEL,
    topSpeed: spec.topSpeed * BOOST_TOP_SPEED,
  };
}
