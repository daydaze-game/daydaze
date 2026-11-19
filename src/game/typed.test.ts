// Tests for the narrowing helpers in typed.ts.
import assert from "node:assert/strict";
import test from "node:test";
import { isOneOf, isRecord, must, typedKeys, vec2 } from "./typed.ts";

test("typedKeys lists an object's own keys", () => {
  assert.deepEqual(typedKeys({ a: 1, b: 2 }), ["a", "b"]);
  assert.deepEqual(typedKeys({}), []);
});

test("isOneOf matches only listed literals", () => {
  const list = ["x", "y"] as const;
  assert.equal(isOneOf(list, "x"), true);
  assert.equal(isOneOf(list, "z"), false);
  assert.equal(isOneOf(list, 3), false);
});

test("isRecord accepts plain objects only", () => {
  assert.equal(isRecord({}), true);
  for (const v of [null, undefined, [], "s", 4])
    assert.equal(isRecord(v), false);
});

test("must returns a present value and throws on a missing one", () => {
  assert.equal(must(0), 0);
  assert.throws(() => must(undefined, "thing"), /thing/);
  assert.throws(() => must(null));
});

test("vec2 builds an [x, z] pair", () => {
  assert.deepEqual(vec2(1, -2), [1, -2]);
});
