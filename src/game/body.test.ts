// Body sliders: defaults sit mid-range, values clamp to whole steps of 0 to 100,
// saved bodies keep valid traits, and the scale stays in a doll-sized range.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BODY_TRAITS,
  BODY_SCALE_TRAITS,
  DEFAULT_BODY,
  bodyScales,
  cleanBody,
  clampTrait,
  dollShapeKeys,
  figureMorphs,
} from "./body.ts";
import { DEFAULT_FACE, FACE_SLIDERS } from "./look.ts";

test("the default body sits in the middle of every slider", () => {
  for (const trait of BODY_TRAITS)
    assert.equal(DEFAULT_BODY[trait], trait === "muscle" ? 0 : 50);
});

test("slider values clamp to 0 to 100 in whole steps", () => {
  assert.equal(clampTrait(-10), 0);
  assert.equal(clampTrait(150), 100);
  assert.equal(clampTrait(42.6), 43);
  assert.equal(clampTrait(Number.NaN), 50);
});

test("a saved body keeps valid traits and resets the rest", () => {
  assert.deepEqual(
    cleanBody({ bust: 80, hips: "big", waist: 0, height: 101 }),
    { ...DEFAULT_BODY, bust: 80, hips: 50, waist: 0, height: 50 },
  );
  assert.deepEqual(cleanBody(undefined), DEFAULT_BODY);
  assert.deepEqual(cleanBody([]), DEFAULT_BODY);
});

test("the default body is the identity scale", () => {
  const scales = bodyScales(DEFAULT_BODY);
  for (const value of Object.values(scales)) {
    assert.ok(Math.abs(value - 1) < 0.01, String(value));
  }
});

test("every trait stays within a doll-sized range, clothed or not", () => {
  for (const trait of BODY_SCALE_TRAITS) {
    const low = bodyScales({ ...DEFAULT_BODY, [trait]: 0 });
    const high = bodyScales({ ...DEFAULT_BODY, [trait]: 100 });
    assert.ok(low[trait] >= 0.9 && low[trait] <= 1.1, `${trait} low`);
    assert.ok(high[trait] >= 0.9 && high[trait] <= 1.1, `${trait} high`);
    assert.ok(high[trait] > low[trait], `${trait} grows with its slider`);
  }
});

test("weight blends through the selected figure to slim and fuller endpoints", () => {
  const middle = figureMorphs(DEFAULT_BODY, "curvy");
  assert.deepEqual(middle, { curvy: 1, slim: 0, athletic: 0, plus: 0 });
  assert.deepEqual(figureMorphs({ ...DEFAULT_BODY, weight: 0 }, "curvy"), {
    curvy: 0,
    slim: 1,
    athletic: 0,
    plus: 0,
  });
  assert.deepEqual(figureMorphs({ ...DEFAULT_BODY, weight: 100 }, "slim"), {
    curvy: 0,
    slim: 0,
    athletic: 0,
    plus: 1,
  });
  assert.equal(
    figureMorphs({ ...DEFAULT_BODY, weight: 75 }, "curvy").curvy,
    0.5,
  );
  assert.equal(
    figureMorphs({ ...DEFAULT_BODY, weight: 75 }, "curvy").plus,
    0.5,
  );
});

test("muscle definition works independently of weight and does not double a preset", () => {
  const full = { ...DEFAULT_BODY, weight: 100, muscle: 80 };
  assert.equal(figureMorphs(full, "classic").plus, 1);
  assert.equal(figureMorphs(full, "classic").athletic, 0.8);
  assert.equal(
    figureMorphs({ ...DEFAULT_BODY, muscle: 100 }, "athletic").athletic,
    1,
  );
  assert.equal(cleanBody({ weight: 85, muscle: 60 }).weight, 85);
  assert.equal(cleanBody({ weight: 85, muscle: 60 }).muscle, 60);
  assert.deepEqual(cleanBody({ weight: -1, muscle: "strong" }), DEFAULT_BODY);
});

test("shape keys carry every face slider, the figure and the presets", () => {
  const face = {
    ...DEFAULT_FACE,
    figure: "slim" as const,
    eyeShape: "round" as const,
  };
  const keys = new Map(dollShapeKeys(face, DEFAULT_BODY));
  for (const s of FACE_SLIDERS) assert.equal(keys.get(s.id), face[s.id]);
  assert.equal(keys.get("slim"), 1);
  assert.equal(keys.get("curvy"), 0);
  assert.equal(keys.get("eye_round"), 1);
  assert.equal(keys.get("eye_upturned"), 0);
  assert.equal(keys.get("bust"), 0);
  assert.equal(keys.has("classic"), false);
});

test("a monolid is a deep hooded fold with lifted corners", () => {
  const keys = new Map(
    dollShapeKeys({ ...DEFAULT_FACE, eyeShape: "monolid" }, DEFAULT_BODY),
  );
  assert.equal(keys.get("eye_hooded"), 0.9);
  assert.equal(keys.get("eye_upturned"), 0.3);
});
