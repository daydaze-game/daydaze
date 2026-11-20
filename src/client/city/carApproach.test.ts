// A canceled car approach must not leave an old walk target behind.
import assert from "node:assert/strict";
import test from "node:test";
import type { Walker } from "../../game/walker.ts";
import { cancelCarApproach, ownsCarApproach } from "./carApproach.ts";

test("canceling an active car approach clears its walk target", () => {
  const walker: Pick<Walker, "target"> = { target: [4, 8] };
  cancelCarApproach(walker, walker.target);
  assert.equal(walker.target, null);
});

test("canceling an inactive car approach preserves unrelated walks", () => {
  const walker: Pick<Walker, "target"> = { target: [4, 8] };
  cancelCarApproach(walker, null);
  assert.deepEqual(walker.target, [4, 8]);
});

test("a replacement destination is not owned by the car approach", () => {
  const original = [4, 8] as const;
  const walker: Pick<Walker, "target"> = { target: [9, 3] };
  assert.equal(ownsCarApproach(walker, original), false);
  cancelCarApproach(walker, original);
  assert.deepEqual(walker.target, [9, 3]);
});
