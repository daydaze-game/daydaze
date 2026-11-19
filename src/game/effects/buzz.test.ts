// The buzz: drinks absorb over real (squeezed) minutes, the liver clears a
// steady amount, food slows the rise, water only eases the hangover, a big
// night leaves one; the drunk look and body start at the BAC the research
// gives; chat slurs; the intensity setting and reduced motion.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ALCOHOL_SCALE,
  BAC_FULL,
  bodyFor,
  DRUNK_BODY,
  HANGOVER_SECONDS,
  shownBuzz,
  stateSituation,
  SWAY_AMOUNT,
  SWAY_HZ,
  buzzLevel,
  chatDistort,
  drinkUp,
  drunkBody,
  eat,
  intensityFactor,
  isIntensity,
  sipWater,
  soberBar,
  stepBar,
  visualParams,
  type Bar,
  type Drink,
} from "./buzz.ts";
import { clipOf } from "../dance/clips.ts";
import { BODY, soberMeters } from "./substances.ts";

/** Steps a bar `seconds` in one-second ticks, giving the highest BAC seen. */
function run(bar: Bar, seconds: number): number {
  let top = bar.bac;
  for (let s = 0; s < seconds; s++) {
    stepBar(bar, 1);
    top = Math.max(top, bar.bac);
  }
  return top;
}
const realMinutes = (playSeconds: number) => (playSeconds * ALCOHOL_SCALE) / 60;

test("a drink isn't felt at once: it absorbs, peaks, then clears", () => {
  const bar = soberBar();
  drinkUp(bar, "cocktail");
  assert.equal(bar.bac, 0);
  stepBar(bar, 1);
  assert.ok(bar.bac > 0 && bar.bac < 0.005);
  let peakAt = 0;
  let top = 0;
  for (let s = 1; s < 2000; s++) {
    stepBar(bar, 1);
    if (bar.bac > top) {
      top = bar.bac;
      peakAt = s;
    }
  }
  // one cocktail peaks around 0.02-0.035, 30-90 real minutes in
  assert.ok(top > 0.02 && top < 0.035, `peak ${top}`);
  assert.ok(realMinutes(peakAt) >= 25 && realMinutes(peakAt) <= 90);
  assert.equal(bar.bac, 0);
});

test("the liver clears a steady 0.015% a real hour, whatever she does", () => {
  const bar = soberBar();
  bar.bac = 0.1;
  const hour = 3600 / ALCOHOL_SCALE;
  run(bar, Math.round(hour));
  assert.ok(Math.abs(bar.bac - 0.085) < 0.001, `${bar.bac}`);
  // water doesn't sober her up
  const before = bar.bac;
  sipWater(bar);
  assert.equal(bar.bac, before);
});

test("a fizzy cocktail rises faster than a neat shot; food slows and lowers it", () => {
  const rise = (drink: Drink, fed: boolean) => {
    const bar = soberBar();
    if (fed) eat(bar);
    drinkUp(bar, drink);
    run(bar, 60);
    return bar.bac;
  };
  assert.ok(rise("cocktail", false) > rise("shot", false));
  assert.ok(rise("cocktail", true) < rise("cocktail", false));
  const peak = (fed: boolean) => {
    const bar = soberBar();
    if (fed) eat(bar);
    drinkUp(bar, "shot");
    drinkUp(bar, "shot");
    return run(bar, 900);
  };
  assert.ok(peak(true) < peak(false));
});

test("drinks add up, and the meter reads BAC over 0.25", () => {
  const bar = soberBar();
  for (let i = 0; i < 6; i++) drinkUp(bar, "shot");
  const top = run(bar, 400);
  assert.ok(top > 0.08, `six shots peak at ${top}`);
  bar.bac = BAC_FULL / 2;
  assert.equal(buzzLevel(bar), 0.5);
  bar.bac = 1;
  assert.equal(buzzLevel(bar), 1);
  bar.bac = Number.NaN;
  assert.equal(buzzLevel(bar), 0);
  stepBar(bar, Number.NaN);
  assert.equal(bar.bac, 0);
});

test("a big night leaves a hangover once she's sober; water eases it; it passes", () => {
  const light = soberBar();
  drinkUp(light, "beer");
  run(light, 1500);
  assert.equal(light.hangover, 0, "one beer, no hangover");
  const big = soberBar();
  big.bac = 0.16;
  run(big, 1);
  assert.equal(big.hangover, 0, "still drunk, not hungover yet");
  run(big, Math.ceil((0.16 / 0.015) * (3600 / ALCOHOL_SCALE)) + 5);
  assert.equal(big.bac, 0);
  assert.ok(big.hangover > 0.5, `${big.hangover}`);
  const before = big.hangover;
  sipWater(big);
  assert.ok(big.hangover < before);
  run(big, Math.ceil(HANGOVER_SECONDS));
  assert.equal(big.hangover, 0);
});

test("her body by stage: tipsy, drunk, sloppy, hungover; sober stands sober", () => {
  const level = (bac: number) => bac / BAC_FULL;
  assert.equal(drunkBody(0, 0), null);
  assert.equal(drunkBody(level(0.01), 0), null);
  assert.equal(drunkBody(level(0.03), 0), DRUNK_BODY.tipsy);
  assert.equal(drunkBody(level(0.09), 0), DRUNK_BODY.drunk);
  assert.equal(drunkBody(level(0.2), 0), DRUNK_BODY.sloppy);
  assert.equal(drunkBody(0, 0.5), DRUNK_BODY.hungover);
  for (const body of Object.values(DRUNK_BODY)) {
    for (const id of body.loops) assert.equal(clipOf(id)?.pack, "core", id);
    for (const id of body.tics) assert.ok(clipOf(id), id);
  }
});

test("her body shows the stronger of the drink and a substance", () => {
  const m = soberMeters();
  assert.equal(bodyFor(m, 0, 0), null);
  assert.equal(bodyFor(m, 0.5, 0), DRUNK_BODY.drunk);
  m.trip = { level: 0.6, phase: "peak", strain: "hybrid" };
  assert.equal(bodyFor(m, 0.5, 0), BODY.trip.peak);
  assert.equal(bodyFor(m, 0.8, 0), DRUNK_BODY.sloppy);
  m.trip = { level: 0.3, phase: "comeup", strain: "hybrid" };
  assert.equal(bodyFor(m, 0, 1), BODY.trip.comeup);
});

test("NPCs react once her body shows it: drunk, high or tripping", () => {
  const level = (bac: number) => bac / BAC_FULL;
  const m = soberMeters();
  assert.equal(stateSituation(m, 0), null);
  assert.equal(
    stateSituation(m, level(0.04)),
    null,
    "tipsy still talks normally",
  );
  assert.equal(stateSituation(m, level(0.07)), "state-drunk");
  m.high = { level: 0.5, phase: "peak", strain: "hybrid" };
  assert.equal(
    stateSituation(m, level(0.07)),
    "state-high",
    "the stronger wins",
  );
  assert.equal(stateSituation(m, level(0.2)), "state-drunk");
  m.high = { level: 0.1, phase: "comeup", strain: "hybrid" };
  assert.equal(stateSituation(m, 0), null, "below FELT it doesn't show");
  m.acid = { level: 0.5, phase: "peak", strain: "hybrid" };
  assert.equal(stateSituation(m, 0), "state-tripping");
  m.acid = { level: 0, phase: null, strain: "hybrid" };
  m.trip = { level: 0.5, phase: "peak", strain: "hybrid" };
  assert.equal(stateSituation(m, 0), "state-tripping");
  m.trip = { level: 0, phase: null, strain: "hybrid" };
  m.cocaine = { level: 0.5, phase: "peak", strain: "hybrid" };
  assert.equal(
    stateSituation(m, level(0.07)),
    "state-drunk",
    "no cocaine lines yet",
  );
});

test("each drunk effect starts at its BAC: a drink or two only warms the colors", () => {
  const level = (bac: number) => bac / BAC_FULL;
  const two = visualParams(level(0.04), "full", false);
  assert.ok(two.warm > 0);
  assert.equal(two.sway, 0);
  assert.equal(two.wobble, 0);
  assert.equal(two.ghost, 0);
  const legal = visualParams(level(0.07), "full", false);
  assert.ok(legal.sway > 0, "nystagmus from about 0.06");
  assert.equal(legal.wobble, 0, "visible sway from about 0.08");
  const heavy = visualParams(level(0.18), "full", false);
  assert.ok(heavy.wobble > 0 && heavy.ghost > 0);
  assert.ok(visualParams(0, "full", false, 1).glare > 0);
  assert.equal(visualParams(0, "full", false, 0).glare, 0);
});

test("chat stays plain when the buzz is low", () => {
  assert.equal(chatDistort("hey you there", 0.1, 7), "hey you there");
  assert.equal(chatDistort("", 1, 7), "");
});

test("chat stretches vowels when the buzz is up", () => {
  const out = chatDistort("hey you there", 1, 3);
  assert.notEqual(out, "hey you there");
  assert.ok(out.length > "hey you there".length);
});

test("chat distortion is deterministic for a seed", () => {
  const line = "heyy everyone, who wants another round";
  assert.equal(chatDistort(line, 0.8, 42), chatDistort(line, 0.8, 42));
});

test("a different seed slurs differently", () => {
  const line = "heyy everyone, who wants another round";
  const outs = new Set([1, 2, 3, 4, 5].map((s) => chatDistort(line, 1, s)));
  assert.ok(outs.size > 1);
});

test("chat distortion only stretches vowels, so consonants and spaces survive", () => {
  const line = "bring the bass";
  const out = chatDistort(line, 1, 9);
  const consonants = (s: string) => s.replace(/[aeiouy]/gi, "");
  assert.equal(consonants(out), consonants(line));
  assert.equal(out.split(" ").length, 3);
});

test("the intensity setting is one of off, low or full", () => {
  assert.equal(isIntensity("off"), true);
  assert.equal(isIntensity("low"), true);
  assert.equal(isIntensity("full"), true);
  assert.equal(isIntensity("max"), false);
  assert.equal(isIntensity(undefined), false);
  assert.equal(intensityFactor("off"), 0);
  assert.equal(intensityFactor("low"), 0.5);
  assert.equal(intensityFactor("full"), 1);
});

test("intensity off switches every drunk visual off", () => {
  const look = visualParams(1, "off", false, 1);
  assert.deepEqual(look, {
    sway: 0,
    wobble: 0,
    warm: 0,
    edge: 0,
    ghost: 0,
    glare: 0,
  });
});

test("reduced motion keeps only the color and edge changes", () => {
  const look = visualParams(1, "full", true);
  assert.equal(look.sway, 0);
  assert.equal(look.wobble, 0);
  assert.ok(look.warm > 0);
  assert.ok(look.edge > 0);
  assert.ok(look.ghost > 0);
});

test("the full setting is stronger than low, and both grow with the buzz", () => {
  const low = visualParams(0.6, "low", false);
  const full = visualParams(0.6, "full", false);
  assert.ok(full.ghost > low.ghost);
  assert.ok(full.sway > low.sway && low.sway > 0);
  assert.ok(full.wobble > low.wobble);
  assert.ok(visualParams(0.9, "full", false).warm > full.warm);
});

test("sway stays small and slow, so it never strobes", () => {
  const max = visualParams(1, "full", false).sway;
  assert.ok(max <= SWAY_AMOUNT);
  assert.ok(max < 0.01);
  assert.ok(SWAY_HZ < 0.5);
});

test("the buzz a move shows comes from its tier tag", () => {
  assert.equal(shownBuzz("idle"), 0);
  assert.equal(shownBuzz("dance:groove~1"), 0.3);
  assert.equal(shownBuzz("sit@40~3"), 0.9);
  assert.equal(shownBuzz("idle~7"), 0);
});

test("slurred chat never grows past the length it's allowed", () => {
  const long = "a".repeat(120);
  for (let seed = 0; seed < 50; seed++)
    assert.ok(chatDistort(long, 0.9, seed, 120).length <= 120);
  // right at the edge, and with emoji (two UTF-16 units) in the line
  const edge = "hey you 💜 ".repeat(11).slice(0, 119);
  for (let seed = 0; seed < 50; seed++)
    assert.ok(chatDistort(edge, 0.9, seed, 120).length <= 120);
  // short lines still stretch
  assert.notEqual(
    chatDistort("heyo everyone out tonight", 0.9, 3, 120),
    "heyo everyone out tonight",
  );
});
