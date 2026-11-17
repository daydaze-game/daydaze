// The dev network log names each frame by its protocol message type.
import { test } from "node:test";
import assert from "node:assert/strict";
import { frameType } from "./devNetLog.ts";

test("frameType reads a JSON frame's type and marks anything else raw", () => {
  assert.equal(frameType('{"type":"delta","entities":[]}'), "delta");
  assert.equal(frameType('{"kind":"x"}'), "(raw)");
  assert.equal(frameType('{"type":3}'), "(raw)");
  assert.equal(frameType("not json"), "(raw)");
  assert.equal(frameType("null"), "(raw)");
});
