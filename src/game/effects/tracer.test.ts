// Tracer decay: the fade is per second of real time, so a 30 Hz and a 144 Hz
// screen leave the same trail.
import { test } from "node:test";
import assert from "node:assert/strict";
import { TRACER_DAMP, tracerDamp } from "./tracer.ts";

test("one 60 Hz frame fades by the base factor", () => {
  assert.ok(Math.abs(tracerDamp(1 / 60) - TRACER_DAMP) < 1e-9);
});

test("the same time passes the same fade at any frame rate", () => {
  const at = (hz: number) => tracerDamp(1 / hz) ** hz;
  assert.ok(Math.abs(at(30) - at(144)) < 1e-9);
  assert.ok(Math.abs(at(30) - TRACER_DAMP ** 60) < 1e-9);
});

test("a long frame fades more, a bad dt fades nothing extra", () => {
  assert.ok(tracerDamp(0.1) < tracerDamp(1 / 60));
  for (const dt of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    const d = tracerDamp(dt);
    assert.ok(Number.isFinite(d) && d >= 0 && d <= 1, `dt ${dt} gave ${d}`);
  }
});
