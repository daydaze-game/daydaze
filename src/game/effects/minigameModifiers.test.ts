// The offline adult minigame assist is bounded, gated and deterministic.
import assert from "node:assert/strict";
import test from "node:test";
import {
  highAssist,
  sweepDuration,
  timingWindow,
} from "./minigameModifiers.ts";

test("high assist requires adult offline play and clamps the local meter", () => {
  assert.equal(highAssist(1, false, false), 0);
  assert.equal(highAssist(1, true, true), 0);
  assert.equal(highAssist(0, true, false), 0);
  assert.equal(highAssist(0.5, true, false), 0.5);
  assert.equal(highAssist(-1, true, false), 0);
  assert.equal(highAssist(2, true, false), 1);
  assert.equal(highAssist(Number.NaN, true, false), 0);
});

test("timing window grows by at most 25 percent", () => {
  assert.equal(timingWindow(140, 0), 140);
  assert.equal(timingWindow(140, 0.5), 157.5);
  assert.equal(timingWindow(140, 1), 175);
});

test("sweep duration grows by at most 15 percent", () => {
  assert.equal(sweepDuration(1000, 0), 1000);
  assert.equal(sweepDuration(1000, 0.5), 1075);
  assert.equal(sweepDuration(1000, 1), 1150);
});
