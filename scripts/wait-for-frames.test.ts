// Tests for the screencast wait that keeps a frame strip recording until its
// frames arrive (issue #75: slow rooms delivered none inside a fixed window).
import assert from "node:assert/strict";
import { test } from "node:test";
import { waitForFrames } from "./wait-for-frames.ts";

/** A fake clock: sleeping just moves time forward. */
function fakeClock() {
  let t = 0;
  return {
    now: () => t,
    sleep: (ms: number) => {
      t += ms;
      return Promise.resolve();
    },
  };
}

test("stops at the minimum window when the frames are already there", async () => {
  const clock = fakeClock();
  const r = await waitForFrames({
    have: () => 8,
    want: 8,
    minMs: 12_000,
    maxMs: 120_000,
    clock,
  });
  assert.deepEqual(r, { reached: true, elapsedMs: 12_000 });
});

test("keeps recording past the minimum window until the frames arrive", async () => {
  // green-haze at high quality on CI: the first screencast frames come
  // after about 25 s, long after the old fixed 12 s window had ended
  const clock = fakeClock();
  const r = await waitForFrames({
    have: () => (clock.now() >= 25_000 ? 8 : 0),
    want: 8,
    minMs: 12_000,
    maxMs: 120_000,
    clock,
  });
  assert.deepEqual(r, { reached: true, elapsedMs: 25_000 });
});

test("gives up at the maximum window when no frame ever arrives", async () => {
  const clock = fakeClock();
  const r = await waitForFrames({
    have: () => 0,
    want: 8,
    minMs: 12_000,
    maxMs: 120_000,
    clock,
  });
  assert.deepEqual(r, { reached: false, elapsedMs: 120_000 });
});

test("a window that is not a whole number of polls still ends on time", async () => {
  const clock = fakeClock();
  const r = await waitForFrames({
    have: () => 0,
    want: 1,
    minMs: 500,
    maxMs: 2_500,
    pollMs: 1_000,
    clock,
  });
  assert.deepEqual(r, { reached: false, elapsedMs: 2_500 });
});
