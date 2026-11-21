// Tests for the dance-off clock: it must load in Node unit tests, where there is
// no `window` or `location` global, and fall back to the real clock.

import assert from "node:assert/strict";
import { test } from "node:test";

test("dance-off clock loads without a window global and reads a finite time", async () => {
  assert.equal(typeof window, "undefined");
  const { danceOffClock } = await import("./danceOffClock.ts");
  assert.ok(Number.isFinite(danceOffClock()));
});
