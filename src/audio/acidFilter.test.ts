// The acid sound: the level maps to a high-shelf lift and a short echo that
// grow together and vanish at 0, and the filter hands the bus its nodes.
import test from "node:test";
import assert from "node:assert/strict";
import { toAudioContext } from "./fakeAudioContext.ts";
import {
  ACID_ECHO_FEEDBACK,
  ACID_ECHO_MIX,
  ACID_SHELF_DB,
  acidParams,
  createAcidFilter,
} from "./acidFilter.ts";

test("sober is a no-op: no lift, no echo", () => {
  assert.deepEqual(acidParams(0), {
    shelfDb: 0,
    echoMix: 0,
    echoFeedback: 0,
  });
});

test("the lift and echo grow with the level and top out at 1", () => {
  const half = acidParams(0.5);
  const full = acidParams(1);
  assert.ok(half.shelfDb > 0 && half.shelfDb < full.shelfDb);
  assert.ok(half.echoMix > 0 && half.echoMix < full.echoMix);
  assert.ok(half.echoFeedback > 0 && half.echoFeedback < full.echoFeedback);
  assert.deepEqual(full, {
    shelfDb: ACID_SHELF_DB,
    echoMix: ACID_ECHO_MIX,
    echoFeedback: ACID_ECHO_FEEDBACK,
  });
  assert.deepEqual(acidParams(7), full);
});

test("the echo always dies away: feedback stays under 1", () => {
  assert.ok(ACID_ECHO_FEEDBACK < 1);
});

test("bad levels read as sober", () => {
  assert.deepEqual(acidParams(NaN), acidParams(0));
  assert.deepEqual(acidParams(-2), acidParams(0));
});

test("setLevel eases each node's parameter toward the mapped value", () => {
  const set: Record<string, number> = {};
  const param = (name: string) => ({
    value: 0,
    setTargetAtTime: (v: number) => {
      set[name] = v;
    },
  });
  const node = (names: string[] = []) => ({
    connect: () => {},
    ...Object.fromEntries(names.map((n) => [n, param(n)])),
  });
  const ctx = toAudioContext({
    currentTime: 0,
    createGain: () => node(["gain"]),
    createBiquadFilter: () => ({
      ...node(["gain"]),
      type: "",
      frequency: { value: 0 },
    }),
    createDelay: () => ({ ...node(), delayTime: { value: 0 } }),
  });
  const filter = createAcidFilter(ctx);
  assert.ok(filter.input && filter.output);
  filter.setLevel(1);
  assert.equal(set.gain, ACID_ECHO_FEEDBACK); // the last gain written
});
