// Tests for smoke effect trigger and store.
import { test } from "node:test";
import assert from "node:assert/strict";
import { smokeStore, triggerSmoke } from "./smokeEffect.ts";

test("triggerSmoke sets dose, timestamp, and duration", () => {
  assert.equal(smokeStore.get().dose, null);
  triggerSmoke("joint", 100);
  assert.deepEqual(smokeStore.get(), {
    dose: "joint",
    startedAt: 100,
    duration: 5,
  });

  triggerSmoke("vape", 150);
  assert.deepEqual(smokeStore.get(), {
    dose: "vape",
    startedAt: 150,
    duration: 5,
  });
});
