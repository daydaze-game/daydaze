// The high music filter: the weed level maps to reverb bloom and low-pass
// roll-off, transparent at level 0 and maxing at level 1.
import test from "node:test";
import assert from "node:assert/strict";
import { toAudioContext } from "./fakeAudioContext.ts";
import {
  HIGH_LOWPASS_MAX_HZ,
  HIGH_LOWPASS_MIN_HZ,
  HIGH_LOWPASS_Q,
  HIGH_REVERB_FEEDBACK,
  HIGH_REVERB_MIX,
  createHighFilter,
  highFilterParams,
} from "./highFilter.ts";

test("sober (level 0) is transparent: full dry bypass, no filter/reverb", () => {
  assert.deepEqual(highFilterParams(0), {
    dryMix: 1,
    wetMix: 0,
    reverbMix: 0,
    reverbFeedback: 0,
    lowpassHz: HIGH_LOWPASS_MAX_HZ,
    resonanceQ: 0,
  });
});

test("bloom and lowpass roll-off grow with level and clamp at 1", () => {
  const half = highFilterParams(0.5);
  const full = highFilterParams(1);
  assert.equal(half.dryMix, 0.5);
  assert.equal(half.wetMix, 0.5);
  assert.ok(half.reverbMix > 0 && half.reverbMix < full.reverbMix);
  assert.ok(
    half.reverbFeedback > 0 && half.reverbFeedback < full.reverbFeedback,
  );
  assert.ok(
    half.lowpassHz < HIGH_LOWPASS_MAX_HZ && half.lowpassHz > full.lowpassHz,
  );
  assert.ok(half.resonanceQ > 0 && half.resonanceQ < full.resonanceQ);
  assert.deepEqual(full, {
    dryMix: 0,
    wetMix: 1,
    reverbMix: HIGH_REVERB_MIX,
    reverbFeedback: HIGH_REVERB_FEEDBACK,
    lowpassHz: HIGH_LOWPASS_MIN_HZ,
    resonanceQ: HIGH_LOWPASS_Q,
  });
  assert.deepEqual(highFilterParams(4), full);
});

test("reverb feedback stays well under 1 so it decays safely", () => {
  assert.ok(HIGH_REVERB_FEEDBACK < 1);
});

test("bad levels read as sober", () => {
  assert.deepEqual(highFilterParams(NaN), highFilterParams(0));
  assert.deepEqual(highFilterParams(-1), highFilterParams(0));
});

test("setLevel eases filter nodes toward mapped values", () => {
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
      ...node(),
      type: "",
      frequency: param("frequency"),
      Q: param("Q"),
    }),
    createDelay: () => ({ ...node(), delayTime: { value: 0 } }),
  });
  const filter = createHighFilter(ctx);
  assert.ok(filter.input && filter.output);
  filter.setLevel(1);
  assert.equal(set.frequency, HIGH_LOWPASS_MIN_HZ);
  assert.equal(set.Q, HIGH_LOWPASS_Q);
  assert.equal(set.gain, HIGH_REVERB_FEEDBACK);
});
