// The streak chime stays silent and never throws when Web Audio is unavailable.
import { test } from "node:test";
import assert from "node:assert/strict";
import { resetSharedAudioBusForTests } from "./audioBus.ts";
import { playStreakMilestone } from "./streakSound.ts";

test("the streak chime is silent without Web Audio", () => {
  resetSharedAudioBusForTests();
  assert.equal(playStreakMilestone(0), false);
  assert.equal(playStreakMilestone(1), false);
});
