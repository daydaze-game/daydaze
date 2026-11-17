// The substances: researched timelines squeezed into play time, each dose's
// curve and phase, meters adding up, which one her body shows, and the
// screen look.
import { test } from "node:test";
import assert from "node:assert/strict";
import { clipOf } from "../dance/clips.ts";
import {
  BODY,
  bodyOf,
  BREATHE_AMOUNT,
  DOSES,
  doseLevel,
  gameSeconds,
  highParams,
  isDose,
  phaseOf,
  readMeters,
  soberMeters,
  spent,
  strongest,
  SUBSTANCES,
  type Taken,
} from "./substances.ts";

test("real minutes squeeze into play seconds on one rising curve", () => {
  assert.equal(gameSeconds(0), 0);
  assert.equal(gameSeconds(-5), 0);
  assert.ok(Math.abs(gameSeconds(60) - 233.8) < 0.5);
  assert.ok(Math.abs(gameSeconds(600) - 928) < 1);
  for (let m = 1; m < 700; m += 7)
    assert.ok(gameSeconds(m + 1) > gameSeconds(m));
});

test("every timeline runs onset < peak < peak end < end, as researched", () => {
  for (const [id, p] of Object.entries(DOSES)) {
    assert.ok(p.onset < p.peak && p.peak < p.peakEnd && p.peakEnd < p.end, id);
    assert.ok(p.strength > 0 && p.strength <= 1, id);
    assert.ok(SUBSTANCES.includes(p.substance), id);
  }
  // a joint lasts 2.5-5 h, an edible 4-10 h, mushroom tea about 3-6 h
  assert.ok(DOSES.joint.end >= 150 && DOSES.joint.end <= 300);
  assert.ok(DOSES.edible.end >= 240 && DOSES.edible.end <= 600);
  assert.ok(DOSES.tea.end >= 180 && DOSES.tea.end <= 360);
  // an edible lands 20 min-2 h in, far later than a joint
  assert.ok(DOSES.edible.onset >= 20 && DOSES.edible.onset > DOSES.joint.onset);
  assert.equal(isDose("joint"), true);
  assert.equal(isDose("toString"), false);
});

test("a dose builds, holds and fades, with its phases", () => {
  const p = DOSES.tea;
  const at = (m: number) => gameSeconds(m);
  assert.equal(doseLevel(p, 0), 0);
  assert.equal(phaseOf(p, 0), null);
  assert.equal(doseLevel(p, at(p.onset) - 1), 0);
  const rising = doseLevel(p, at((p.onset + p.peak) / 2));
  assert.ok(rising > 0 && rising < p.strength);
  assert.equal(phaseOf(p, at((p.onset + p.peak) / 2)), "comeup");
  assert.equal(doseLevel(p, at(p.peak + 1)), p.strength);
  assert.equal(phaseOf(p, at(p.peak + 1)), "peak");
  const falling = doseLevel(p, at((p.peakEnd + p.end) / 2));
  assert.ok(falling > 0 && falling < p.strength);
  assert.equal(phaseOf(p, at((p.peakEnd + p.end) / 2)), "comedown");
  assert.equal(doseLevel(p, at(p.end)), 0);
  assert.equal(phaseOf(p, at(p.end)), null);
  assert.equal(doseLevel(p, NaN), 0);
});

test("the edible trap: at a joint's peak an edible hasn't landed yet", () => {
  const t = gameSeconds(DOSES.joint.peak + 1);
  assert.ok(doseLevel(DOSES.joint, t) > 0);
  assert.equal(doseLevel(DOSES.edible, t), 0);
});

test("doses of one substance add up, capped at 1; spent doses drop", () => {
  const peak = gameSeconds(DOSES.joint.peak + 1);
  const two: Taken[] = [
    { dose: "joint", at: 0 },
    { dose: "joint", at: 0 },
  ];
  const m = readMeters(two, peak, soberMeters());
  assert.ok(Math.abs(m.high.level - 2 * DOSES.joint.strength) < 1e-9);
  assert.equal(m.high.phase, "peak");
  assert.equal(m.trip.level, 0);
  const many = Array.from({ length: 5 }, (): Taken => ({
    dose: "joint",
    at: 0,
  }));
  assert.equal(readMeters(many, peak, soberMeters()).high.level, 1);
  // a fresh joint on top of one at its peak still reads as the peak
  const late = readMeters(
    [
      { dose: "joint", at: 0 },
      { dose: "joint", at: peak - gameSeconds(DOSES.joint.onset) - 1 },
    ],
    peak,
    soberMeters(),
  );
  assert.equal(late.high.phase, "peak");
  // the meters are rewritten, not added to, every read
  const out = readMeters(two, peak, soberMeters());
  readMeters([], peak, out);
  assert.equal(out.high.level, 0);
  assert.equal(out.high.phase, null);
  assert.equal(spent({ dose: "joint", at: 0 }, peak), false);
  assert.equal(
    spent({ dose: "joint", at: 0 }, gameSeconds(DOSES.joint.end)),
    true,
  );
});

test("the body shows the strongest felt substance, in its phase", () => {
  const m = soberMeters();
  assert.equal(strongest(m), null);
  assert.equal(bodyOf(m), null);
  m.high = { level: 0.1, phase: "peak" };
  assert.equal(strongest(m), null);
  m.high = { level: 0.3, phase: "peak" };
  assert.equal(strongest(m), "high");
  assert.equal(bodyOf(m), BODY.high.peak);
  m.trip = { level: 0.5, phase: "comeup" };
  assert.equal(bodyOf(m), BODY.trip.comeup);
  // mushrooms' come-up signature is the yawn
  assert.ok(BODY.trip.comeup.tics.includes("yawn"));
});

test("every body clip is baked; loops are core idles, played calmer than sober", () => {
  for (const s of SUBSTANCES)
    for (const [phase, body] of Object.entries(BODY[s])) {
      assert.ok(body.loops.length > 0 && body.tics.length > 0, `${s} ${phase}`);
      assert.ok(body.rate > 0.5 && body.rate <= 1.3, `${s} ${phase}`);
      for (const id of body.loops) {
        assert.equal(clipOf(id)?.kind, "idle", id);
        assert.equal(clipOf(id)?.pack, "core", id);
      }
      for (const id of body.tics) assert.ok(clipOf(id), id);
    }
});

test("the trip breathes and cycles color; reduced motion keeps only color", () => {
  const m = soberMeters();
  m.trip = { level: 1, phase: "peak" };
  const full = highParams(m, 1, false);
  assert.equal(full.breathe, BREATHE_AMOUNT);
  assert.equal(full.hue, 1);
  assert.equal(full.geometry, 0);
  const calm = highParams(m, 1, true);
  assert.equal(calm.breathe, 0);
  assert.equal(calm.hue, 1);
  assert.equal(calm.drift, 0);
  m.high = { level: 1, phase: "peak" };
  assert.deepEqual(highParams(m, 0, false), {
    glow: 0,
    hue: 0,
    breathe: 0,
    drift: 1,
    radiance: 0,
    geometry: 0,
    tracer: 0,
    wiggle: 0,
  });
});

test("a tab's timeline sits in the research ranges and outlasts every dose", () => {
  const t = DOSES.tab;
  assert.equal(t.substance, "acid");
  // onset 15-60 min, peak reached within 90 min, 8-12 h in all
  assert.ok(t.onset >= 15 && t.onset <= 60);
  assert.ok(t.peak <= 90);
  assert.ok(t.end >= 480 && t.end <= 720);
  for (const [id, p] of Object.entries(DOSES))
    if (id !== "tab") assert.ok(t.end > p.end, id);
});

test("acid is energetic where mushrooms are heavy", () => {
  assert.ok(BODY.acid.comeup.tics.includes("yawn"));
  assert.ok(BODY.acid.peak.rate > 1);
  for (const s of ["high", "trip"] as const)
    for (const [phase, body] of Object.entries(BODY[s]))
      assert.ok(BODY.acid.peak.rate > body.rate, `${s} ${phase}`);
});

test("a tab raises acid and leaves the trip alone", () => {
  const peak = gameSeconds(DOSES.tab.peak + 1);
  const m = readMeters([{ dose: "tab", at: 0 }], peak, soberMeters());
  assert.equal(m.acid.level, DOSES.tab.strength);
  assert.equal(m.acid.phase, "peak");
  assert.equal(m.trip.level, 0);
  assert.equal(strongest(m), "acid");
});

test("acid is radiant, geometric and leaves tracers; calm keeps only color", () => {
  const m = soberMeters();
  m.acid = { level: 0.65, phase: "peak" };
  const full = highParams(m, 1, false);
  assert.ok(full.radiance > 0 && full.geometry > 0 && full.tracer > 0);
  assert.ok(full.tracer < full.geometry);
  assert.ok(full.hue > 0 && full.breathe > 0 && full.glow > 0);
  const calm = highParams(m, 1, true);
  assert.equal(calm.radiance, full.radiance);
  assert.equal(calm.geometry, 0);
  assert.equal(calm.tracer, 0);
  assert.equal(calm.breathe, 0);
  assert.ok(calm.hue > 0);
  // every field stays in its range even at the cap
  m.acid.level = 1;
  m.trip.level = 1;
  const top = highParams(m, 1, false);
  for (const v of [top.glow, top.hue, top.radiance, top.geometry, top.tracer])
    assert.ok(v >= 0 && v <= 1);
});

test("a pill's timeline sits in the research ranges and the tab outlasts it", () => {
  const p = DOSES.pill;
  assert.equal(p.substance, "molly");
  // felt in 30-45 min, up over 15-30 more, 3-6 h in all
  assert.ok(p.onset >= 20 && p.onset <= 60);
  assert.ok(p.peak - p.onset >= 15 && p.peak - p.onset <= 30);
  assert.ok(p.end >= 180 && p.end <= 360);
  assert.ok(DOSES.tab.end > p.end);
});

test("molly is for dancing, with a tic to start", () => {
  assert.ok(BODY.molly.peak.rate > 1);
  assert.ok(BODY.molly.comeup.tics.length > 0);
});

test("a pill raises molly, leaves acid and the trip alone, and two add up", () => {
  const peak = gameSeconds(DOSES.pill.peak + 1);
  const m = readMeters([{ dose: "pill", at: 0 }], peak, soberMeters());
  assert.equal(m.molly.level, DOSES.pill.strength);
  assert.equal(m.molly.phase, "peak");
  assert.equal(m.acid.level, 0);
  assert.equal(m.trip.level, 0);
  assert.equal(strongest(m), "molly");
  const two = readMeters(
    [
      { dose: "pill", at: 0 },
      { dose: "pill", at: 0 },
    ],
    peak,
    soberMeters(),
  );
  assert.equal(two.molly.level, 1);
});

test("molly glows, leaves faint tracers and wiggles the eyes; no geometry", () => {
  const m = soberMeters();
  m.molly = { level: 0.6, phase: "peak" };
  const full = highParams(m, 1, false);
  assert.ok(full.glow > 0 && full.radiance > 0);
  assert.ok(full.tracer > 0 && full.wiggle > 0);
  assert.equal(full.geometry, 0);
  const acid = soberMeters();
  acid.acid = { level: 0.6, phase: "peak" };
  assert.ok(full.tracer < highParams(acid, 1, false).tracer);
  // reduced motion drops the movement and keeps the color
  const calm = highParams(m, 1, true);
  assert.equal(calm.wiggle, 0);
  assert.equal(calm.tracer, 0);
  assert.equal(calm.radiance, full.radiance);
  assert.ok(calm.glow > 0);
  // intensity off shows nothing
  const off = highParams(m, 0, false);
  assert.equal(off.glow + off.radiance + off.tracer + off.wiggle, 0);
  // everything stays in range at the cap
  m.molly.level = 1;
  m.acid.level = 1;
  const top = highParams(m, 1, false);
  for (const v of [top.glow, top.radiance, top.tracer, top.wiggle])
    assert.ok(v >= 0 && v <= 1);
});

test("a line's timeline sits in the research ranges and is the shortest dose", () => {
  const p = DOSES.line;
  assert.equal(p.substance, "cocaine");
  // felt in 3-10 min, rush peaks within 16 min of that, 10-90 min in all
  assert.ok(p.onset >= 3 && p.onset <= 10);
  assert.ok(p.peak - p.onset <= 16);
  assert.ok(p.end >= 10 && p.end <= 90);
  assert.ok(DOSES.tab.end > p.end && DOSES.pill.end > p.end);
});

test("cocaine is upright and quick, then crashes slow", () => {
  assert.ok(BODY.cocaine.peak.rate > 1);
  assert.ok(BODY.cocaine.comedown.rate < 1);
});

test("a line raises cocaine, leaves the rest alone, and two add up", () => {
  const peak = gameSeconds(DOSES.line.peak + 1);
  const m = readMeters([{ dose: "line", at: 0 }], peak, soberMeters());
  assert.equal(m.cocaine.level, DOSES.line.strength);
  assert.equal(m.cocaine.phase, "peak");
  assert.equal(m.molly.level + m.acid.level + m.trip.level, 0);
  assert.equal(strongest(m), "cocaine");
  const two = readMeters(
    [
      { dose: "line", at: 0 },
      { dose: "line", at: 0 },
    ],
    peak,
    soberMeters(),
  );
  assert.equal(two.cocaine.level, 1);
});

test("cocaine does not bend the screen", () => {
  const m = soberMeters();
  m.cocaine = { level: 1, phase: "peak" };
  assert.deepEqual(
    highParams(m, 1, false),
    highParams(soberMeters(), 1, false),
  );
});
