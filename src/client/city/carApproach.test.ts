// A canceled car approach must not leave an old walk target behind.
import assert from "node:assert/strict";
import test from "node:test";
import type { Walker } from "../../game/walker.ts";
import { cancelCarApproach } from "./carApproach.ts";

test("canceling an active car approach clears its walk target", () => {
  const walker: Pick<Walker, "target"> = { target: [4, 8] };
  cancelCarApproach(walker, true);
  assert.equal(walker.target, null);
});

test("canceling an inactive car approach preserves unrelated walks", () => {
  const walker: Pick<Walker, "target"> = { target: [4, 8] };
  cancelCarApproach(walker, false);
  assert.deepEqual(walker.target, [4, 8]);
});
