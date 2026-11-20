// Tests for the graphics settings model: presets, advanced changes,
// validation of stored values and the move from the old quality setting.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  autoGraphics,
  changeAdvanced,
  cleanGraphics,
  defaultGraphics,
  detailOf,
  forcedGraphics,
  presetGraphics,
} from "./graphics.ts";

test("auto starts on Balanced's values", () => {
  const auto = defaultGraphics();
  assert.equal(auto.preset, "auto");
  assert.deepEqual({ ...auto, preset: "balanced" }, presetGraphics("balanced"));
});

test("presets map to the three tiers and Performance keeps today's low look", () => {
  assert.equal(presetGraphics("performance").tier, "low");
  assert.equal(presetGraphics("balanced").tier, "high");
  assert.equal(presetGraphics("realistic").tier, "ultra");
  const low = presetGraphics("performance");
  assert.equal(low.post, false);
  assert.equal(low.reflections, false);
  assert.equal(low.scale, 1);
  assert.equal(low.distance, "medium");
});

test("changing one advanced setting switches to Custom and keeps the rest", () => {
  const next = changeAdvanced(presetGraphics("realistic"), { ao: false });
  assert.equal(next.preset, "custom");
  assert.equal(next.ao, false);
  assert.equal(next.tier, "ultra");
  assert.equal(next.shadows, true);
});

test("auto steps down: resolution first, then the Performance tier", () => {
  assert.equal(autoGraphics(0).scale, 1.5);
  assert.equal(autoGraphics(1).scale, 1);
  assert.equal(autoGraphics(1).tier, "high");
  assert.equal(autoGraphics(2).tier, "low");
  assert.equal(autoGraphics(9).tier, "low");
});

test("a forced tier (the ?quality flag) uses that tier's preset", () => {
  assert.deepEqual(forcedGraphics("low"), presetGraphics("performance"));
  assert.deepEqual(forcedGraphics("ultra"), presetGraphics("realistic"));
});

test("cleanGraphics keeps a valid custom object", () => {
  const custom = changeAdvanced(presetGraphics("balanced"), {
    bloom: 0.5,
    fpsCap: 30,
    scale: 0.75,
    distance: "far",
  });
  assert.deepEqual(cleanGraphics(JSON.parse(JSON.stringify(custom))), custom);
});

test("a named preset always takes its own values, not stored ones", () => {
  const tampered = { ...presetGraphics("performance"), post: true, bloom: 2 };
  assert.deepEqual(cleanGraphics(tampered), presetGraphics("performance"));
});

test("cleanGraphics repairs custom fields one by one", () => {
  const fixed = cleanGraphics({
    preset: "custom",
    tier: "ultra",
    shadows: "yes",
    ao: true,
    reflections: false,
    post: true,
    bloom: 99,
    distance: "forever",
    scale: 1.1,
    fpsCap: 45,
  });
  const base = presetGraphics("balanced");
  assert.equal(fixed.preset, "custom");
  assert.equal(fixed.tier, "ultra");
  assert.equal(fixed.shadows, base.shadows);
  assert.equal(fixed.ao, true);
  assert.equal(fixed.reflections, false);
  assert.equal(fixed.bloom, base.bloom);
  assert.equal(fixed.distance, base.distance);
  assert.equal(fixed.scale, base.scale);
  assert.equal(fixed.fpsCap, base.fpsCap);
});

test("garbage gives auto; the old quality setting migrates", () => {
  for (const raw of [null, undefined, 3, "low", [], { preset: "ultra" }])
    assert.deepEqual(cleanGraphics(raw), defaultGraphics());
  assert.equal(cleanGraphics(undefined, "low").preset, "performance");
  assert.equal(cleanGraphics(undefined, "high").preset, "balanced");
  assert.equal(cleanGraphics(undefined, "auto").preset, "auto");
  assert.equal(cleanGraphics(undefined, "ultra").preset, "auto");
  // a stored object beats the legacy value
  assert.equal(
    cleanGraphics(presetGraphics("realistic"), "low").preset,
    "realistic",
  );
});

test("two-entry tables use high's numbers for Balanced and Realistic", () => {
  assert.equal(detailOf("low"), "low");
  assert.equal(detailOf("high"), "high");
  assert.equal(detailOf("ultra"), "high");
});
