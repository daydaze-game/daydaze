// Cars and people: stopping distance grows with speed, the speed at contact
// picks a stumble, a knockdown or a hard fall (always with a get-up), the car
// slows, and driving off from a hit is a hit-and-run.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DRIVER_REACTION,
  HIT_AND_RUN_RADIUS,
  HIT_AND_RUN_SECONDS,
  carSpeedAfterHit,
  hitOutcome,
  hitReaction,
  knockback,
  openHitScene,
  stepHitScene,
  stoppingDistance,
  type HitScene,
} from "./carHits.ts";
import { REACTIONS } from "../reactions.ts";

const kmh = (k: number) => k / 3.6;

test("stopping distance is reaction distance plus braking: ~12 m at 30 km/h, ~35 m at 60", () => {
  const at30 = stoppingDistance(kmh(30));
  const at60 = stoppingDistance(kmh(60));
  assert.ok(at30 > 10 && at30 < 14, `30 km/h: ${at30.toFixed(1)} m`);
  assert.ok(at60 > 31 && at60 < 38, `60 km/h: ${at60.toFixed(1)} m`);
  // the reaction alone covers speed x reaction time
  assert.ok(stoppingDistance(10) > 10 * DRIVER_REACTION);
});

test("a stopped car, or nonsense speed, needs no room to stop", () => {
  assert.equal(stoppingDistance(0), 0);
  assert.equal(stoppingDistance(-3), 0);
  assert.equal(stoppingDistance(Number.NaN), 0);
});

test("speed at contact decides the outcome", () => {
  assert.equal(hitOutcome(0.2), null);
  assert.equal(hitOutcome(kmh(5)), "bump");
  assert.equal(hitOutcome(kmh(25)), "knockdown");
  assert.equal(hitOutcome(kmh(60)), "hard-fall");
  assert.equal(hitOutcome(Number.NaN), null);
  // reversing into someone counts by its speed too
  assert.equal(hitOutcome(-kmh(5)), "bump");
});

test("every knockdown ends in a get-up; a bump is a stumble", () => {
  assert.equal(hitReaction("bump"), "stumble");
  for (const o of ["knockdown", "hard-fall"] as const)
    assert.equal(REACTIONS[hitReaction(o)].then, "get-up");
  assert.notEqual(hitReaction("knockdown"), hitReaction("hard-fall"));
});

test("faster hits throw people farther, within reason", () => {
  const slow = knockback(kmh(5));
  const mid = knockback(kmh(30));
  const fast = knockback(kmh(70));
  assert.ok(slow < mid && mid < fast);
  assert.ok(slow > 0 && fast <= 8);
  assert.equal(knockback(Number.NaN), 0);
});

test("the car loses most of its speed on contact, keeping its direction", () => {
  assert.ok(carSpeedAfterHit(15) < 15 * 0.6 && carSpeedAfterHit(15) > 0);
  assert.ok(carSpeedAfterHit(-4) <= 0 && carSpeedAfterHit(-4) > -4);
  assert.equal(carSpeedAfterHit(Number.NaN), 0);
});

test("staying at the scene is no hit-and-run", () => {
  let scene: HitScene | null = openHitScene([0, 0]);
  for (let i = 0; i < 400 && scene; i++) {
    const r = stepHitScene(scene, 1 / 50, [3, 0]);
    assert.equal(r.hitAndRun, false);
    scene = r.scene;
  }
  assert.equal(scene, null);
});

test("driving off within a few seconds is a hit-and-run, counted once", () => {
  let scene: HitScene | null = openHitScene([0, 0]);
  let runs = 0;
  for (let i = 0; i < 300 && scene; i++) {
    const x = (i / 50) * 12; // 12 m/s away from the spot
    const r = stepHitScene(scene, 1 / 50, [x, 0]);
    if (r.hitAndRun) runs++;
    scene = r.scene;
  }
  assert.equal(runs, 1);
  assert.ok(HIT_AND_RUN_RADIUS / 12 < HIT_AND_RUN_SECONDS);
});

test("leaving after the window has passed is not a hit-and-run", () => {
  const r = stepHitScene(
    openHitScene([0, 0]),
    HIT_AND_RUN_SECONDS + 0.1,
    [40, 0],
  );
  assert.equal(r.scene, null);
  assert.equal(r.hitAndRun, false);
});
