// Car tuning: untuned cars are untouched, each part scales the right stats,
// levels clamp, and nitrous burns and refills.
import { test } from "node:test";
import assert from "node:assert/strict";
import { stepCar, type CarState } from "./car.ts";
import { carById } from "./roster.ts";
import {
  MAX_TUNE_LEVEL,
  TUNE_XP,
  UNTUNED,
  boostedSpec,
  cleanTuning,
  nitrousSeconds,
  stepNitrous,
  tuneCost,
  tunedSpec,
  upgrade,
} from "./tuning.ts";

const base = carById("quill-lite");
if (!base) throw new Error("starter sedan missing");

test("an untuned car is the same spec, so stepCar behaves exactly as before", () => {
  assert.equal(tunedSpec(base, UNTUNED), base);
  const s: CarState = { position: [0, 0], yaw: 0.3, speed: 5 };
  const input = { throttle: 1, brake: 0, steer: 0.5 };
  assert.deepEqual(
    stepCar(tunedSpec(base, UNTUNED), s, input, []),
    stepCar(base, s, input, []),
  );
});

test("engine raises top speed and accel, grip raises grip up to 1", () => {
  const e = tunedSpec(base, { engine: 3, grip: 0, nitrous: 0 });
  assert.ok(e.topSpeed > base.topSpeed && e.accel > base.accel);
  assert.equal(e.grip, base.grip);
  const g = tunedSpec(base, { engine: 0, grip: MAX_TUNE_LEVEL, nitrous: 0 });
  assert.ok(g.grip > base.grip && g.grip <= 1);
  assert.equal(g.topSpeed, base.topSpeed);
  const maxed = tunedSpec(
    { ...base, grip: 0.99 },
    { engine: 0, grip: 5, nitrous: 0 },
  );
  assert.equal(maxed.grip, 1);
});

test("cleanTuning clamps and rejects junk", () => {
  assert.deepEqual(cleanTuning({ engine: 99, grip: -2, nitrous: 2.7 }), {
    engine: MAX_TUNE_LEVEL,
    grip: 0,
    nitrous: 2,
  });
  assert.deepEqual(cleanTuning(null), UNTUNED);
  assert.deepEqual(cleanTuning({ engine: "x", grip: NaN }), UNTUNED);
});

test("upgrade adds one level, costs coins and stops at the cap", () => {
  const r = upgrade(UNTUNED, "engine", 1000);
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.tuning.engine, 1);
  assert.equal(r.coins, 1000 - tuneCost("engine", 1));
  assert.equal(r.xp, TUNE_XP.upgrade);
  assert.equal(upgrade(UNTUNED, "grip", 0).ok, false);
  const maxed = { engine: MAX_TUNE_LEVEL, grip: 0, nitrous: 0 };
  assert.equal(upgrade(maxed, "engine", 1e9).ok, false);
});

test("costs rise with level", () => {
  assert.ok(tuneCost("engine", 2) > tuneCost("engine", 1));
});

test("nitrous: no tank without the part; boost raises speed while burning", () => {
  assert.equal(nitrousSeconds(UNTUNED), 0);
  const t = { engine: 0, grip: 0, nitrous: 2 };
  assert.ok(nitrousSeconds(t) > 0);
  assert.equal(stepNitrous(UNTUNED, { fuel: 0 }, true, 1).burning, false);
  const burn = stepNitrous(t, { fuel: nitrousSeconds(t) }, true, 0.5);
  assert.equal(burn.burning, true);
  assert.equal(burn.fuel, nitrousSeconds(t) - 0.5);
  const spec = boostedSpec(base, true);
  assert.ok(spec.topSpeed > base.topSpeed && spec.accel > base.accel);
  assert.equal(boostedSpec(base, false), base);
});

test("nitrous empties, then refills when not pressed, never past full", () => {
  const t = { engine: 0, grip: 0, nitrous: 1 };
  const full = nitrousSeconds(t);
  const empty = stepNitrous(t, { fuel: 0.1 }, true, 1);
  assert.equal(empty.fuel, 0);
  assert.equal(empty.burning, true);
  assert.equal(stepNitrous(t, { fuel: 0 }, true, 1).burning, false);
  const refill = stepNitrous(t, { fuel: 0 }, false, 1);
  assert.ok(refill.fuel > 0 && refill.burning === false);
  assert.equal(stepNitrous(t, { fuel: full }, false, 100).fuel, full);
});
