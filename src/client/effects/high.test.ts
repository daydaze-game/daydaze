// Doses exist only at 18+: at 13+ taking one does nothing. At 18+ a dose
// lands after its onset, shows in the body, and is dropped once spent.
import { test } from "node:test";
import assert from "node:assert/strict";
import { setActiveTier } from "../../game/age.ts";
import { DOSES, gameSeconds } from "../../game/effects/substances.ts";
import { ageHigh, dosesOnboard, getMeters, take } from "./high.ts";

test("at 13+ a dose does nothing", () => {
  setActiveTier("teen");
  assert.equal(take("joint"), false);
  assert.equal(dosesOnboard(), 0);
});

test("at 18+ a joint lands after its onset and wears off", () => {
  setActiveTier("adult");
  try {
    assert.equal(take("joint"), true);
    assert.equal(dosesOnboard(), 1);
    ageHigh(1);
    assert.equal(getMeters().high.level, 0);
    ageHigh(gameSeconds(DOSES.joint.peak));
    assert.equal(getMeters().high.level, DOSES.joint.strength);
    assert.equal(getMeters().high.phase, "peak");
    ageHigh(gameSeconds(DOSES.joint.end));
    assert.equal(getMeters().high.level, 0);
    assert.equal(dosesOnboard(), 0);
  } finally {
    setActiveTier("teen"); // tests share one process
  }
});
