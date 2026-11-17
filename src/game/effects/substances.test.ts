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
  });
});
