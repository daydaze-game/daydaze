// Daylight: noon is full day, midnight is night with neon, evening glows gold,
// light changes smoothly and wraps, and the hour comes from the clock or ?time.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  daylightAt,
  hourOf,
  lampGain,
  laneTint,
  parseTimeFlag,
  windowSky,
} from "./daylight.ts";

test("midnight is night: no sun, the neon at full, moon is up", () => {
  const d = daylightAt(0);
  assert.equal(d.sun, 0);
  assert.equal(d.moon, 1);
  assert.equal(d.neon, 1);
  assert.ok(d.moonElevation > 0, "moon overhead at midnight");
});

test("noon is full day: sun up, no moon or neon, a blue sky", () => {
  const d = daylightAt(12);
  assert.equal(d.sun, 1);
  assert.equal(d.moon, 0);
  assert.equal(d.neon, 0);
  const [r, , b] = d.zenith;
  assert.ok(b > r, "a blue zenith");
});

test("the evening glows gold, between day and night", () => {
  const d = daylightAt(19.5);
  assert.ok(d.golden > 0.6, `golden ${d.golden}`);
  assert.ok(d.sun > 0 && d.sun < 1);
  assert.ok(d.neon > 0 && d.neon < 1);
});

test("light changes smoothly through the whole day, and wraps at midnight", () => {
  let last = daylightAt(0);
  for (let m = 1; m <= 24 * 60; m++) {
    const d = daylightAt(m / 60);
    assert.ok(Math.abs(d.sun - last.sun) < 0.02, `jump at ${m} min`);
    assert.ok(Math.abs(d.neon - last.neon) < 0.02, `neon jump at ${m} min`);
    last = d;
  }
  assert.deepEqual(daylightAt(24), daylightAt(0));
});

test("the sun rises in the east, peaks at noon and sets in the west", () => {
  assert.ok(daylightAt(12).sunElevation > daylightAt(9).sunElevation);
  assert.ok(daylightAt(9).sunDirection[0] > 0, "morning sun in the east (+x)");
  assert.ok(daylightAt(16).sunDirection[0] < 0, "afternoon sun in the west");
});

test("the moon peaks at midnight and arcs across the night sky", () => {
  assert.ok(daylightAt(0).moonElevation > daylightAt(21).moonElevation);
  assert.ok(daylightAt(21).moonDirection[0] > 0, "evening moon in east (+x)");
  assert.ok(daylightAt(3).moonDirection[0] < 0, "late night moon in west");
});

test("directional celestial light never reaches zero intensity", () => {
  for (let m = 0; m < 24 * 60; m++) {
    const d = daylightAt(m / 60);
    // Even at dusk/dawn transition, combined celestial light maintains presence
    const celestialPresence = d.sun + d.moon;
    assert.ok(
      celestialPresence > 0.2,
      `low celestial light at ${m} min: ${celestialPresence}`,
    );
  }
});

test("the hour comes from the local clock, or ?time=HH:MM for screenshots", () => {
  assert.equal(hourOf(new Date(2026, 9, 26, 14, 30)), 14.5);
  assert.equal(parseTimeFlag("?time=21:15"), 21.25);
  assert.equal(parseTimeFlag("?time=8"), 8);
  assert.equal(parseTimeFlag("?time=25"), null);
  assert.equal(parseTimeFlag("?room=city"), null);
});

test("street paint is untinted by day and dim violet at night", () => {
  assert.deepEqual(laneTint(daylightAt(12).neon), [1, 1, 1]);
  const night = laneTint(daylightAt(23).neon);
  assert.ok(night[0] < 0.6 && night[2] > night[0], "dim and violet");
  assert.deepEqual(laneTint(5), laneTint(1));
});

test("car lamps are dull by day and well past the bloom threshold at night", () => {
  assert.ok(lampGain(daylightAt(12).neon) < 1);
  // even a red tail lamp (luminance about 0.2 of white) clears 1 at night
  assert.ok(lampGain(daylightAt(23).neon) * 0.2 > 1);
  assert.equal(lampGain(5), lampGain(1));
  assert.equal(lampGain(-1), lampGain(0));
});

// The sky seen through a room's window follows the hour (issue #110).
const lum = ([r, g, b]: readonly [number, number, number]) =>
  0.2126 * r + 0.7152 * g + 0.0722 * b;

test("windowSky: a blue day sky, a warm dusk, a dark night", () => {
  const noon = windowSky(daylightAt(12));
  assert.ok(noon[2] > noon[0], "blue at noon");
  const dusk = windowSky(daylightAt(19));
  assert.ok(dusk[0] > dusk[2], "warm at dusk");
  const night = windowSky(daylightAt(23.5));
  assert.ok(lum(night) < lum(noon) / 2, "much darker at night than noon");
  assert.ok(lum(night) > 0, "night is dim, not black");
});

test("windowSky: stays in 0..1 at every hour and wraps past midnight", () => {
  for (let h = 0; h < 24; h += 0.25) {
    for (const c of windowSky(daylightAt(h))) assert.ok(c >= 0 && c <= 1);
  }
  assert.deepEqual(windowSky(daylightAt(25)), windowSky(daylightAt(1)));
});
