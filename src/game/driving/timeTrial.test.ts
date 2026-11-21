// Time trials: personal bests and route records per route, ghost replays, XP.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_GHOST_SAMPLES,
  TRIAL_XP,
  ghostAt,
  newTrialBook,
  personalBest,
  routeRecord,
  submitRun,
  trialXp,
  type GhostSample,
} from "./timeTrial.ts";

test("the first run on a route is a personal best and the record", () => {
  const r = submitRun(newTrialBook(), "dock", "me", 62_000);
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.personalBest, true);
  assert.equal(r.routeRecord, true);
  assert.equal(personalBest(r.book, "dock", "me")?.timeMs, 62_000);
});

test("slower runs keep the best; faster ones replace it; ties do not", () => {
  let book = newTrialBook();
  const go = (ms: number, who = "me") => {
    const r = submitRun(book, "dock", who, ms);
    assert.ok(r.ok);
    if (!r.ok) throw new Error("unreachable");
    book = r.book;
    return r;
  };
  go(60_000);
  assert.equal(go(61_000).personalBest, false);
  assert.equal(go(60_000).personalBest, false);
  const fast = go(58_500);
  assert.equal(fast.personalBest, true);
  assert.equal(fast.routeRecord, true);
  assert.equal(personalBest(book, "dock", "me")?.timeMs, 58_500);
  // Another player: own PB, but not the record.
  const other = go(59_000, "you");
  assert.equal(other.personalBest, true);
  assert.equal(other.routeRecord, false);
  assert.equal(routeRecord(book, "dock")?.runner, "me");
});

test("routes are independent", () => {
  let book = newTrialBook();
  const a = submitRun(book, "dock", "me", 50_000);
  assert.ok(a.ok);
  if (!a.ok) return;
  book = a.book;
  assert.equal(personalBest(book, "hill", "me"), undefined);
});

test("bad times are rejected and the book is never mutated", () => {
  const book = newTrialBook();
  for (const t of [0, -5, NaN, Infinity]) {
    assert.deepEqual(submitRun(book, "dock", "me", t), {
      ok: false,
      reason: "bad-time",
    });
  }
  submitRun(book, "dock", "me", 1000);
  assert.equal(Object.keys(book.routes).length, 0);
});

test("the ghost of the best run is kept, and downsampled when huge", () => {
  const ghost: GhostSample[] = Array.from(
    { length: MAX_GHOST_SAMPLES * 3 },
    (_, i) => ({
      t: i * 100,
      x: i,
      z: 0,
      yaw: 0,
    }),
  );
  const r = submitRun(newTrialBook(), "dock", "me", 30_000, ghost);
  assert.ok(r.ok);
  if (!r.ok) return;
  const kept = personalBest(r.book, "dock", "me")?.ghost ?? [];
  assert.ok(kept.length > 1 && kept.length <= MAX_GHOST_SAMPLES);
  assert.equal(kept[0]?.t, 0);
  assert.equal(kept.at(-1)?.t, ghost.at(-1)?.t);
});

test("ghostAt interpolates, clamps, and takes the short way round in yaw", () => {
  const g: GhostSample[] = [
    { t: 0, x: 0, z: 0, yaw: 3 },
    { t: 1000, x: 10, z: 20, yaw: -3 },
  ];
  const mid = ghostAt(g, 500);
  assert.equal(mid?.x, 5);
  assert.equal(mid?.z, 10);
  assert.ok(Math.abs(Math.cos(mid?.yaw ?? 0) - -1) < 0.01);
  assert.equal(ghostAt(g, -10)?.x, 0);
  assert.equal(ghostAt(g, 9999)?.x, 10);
  assert.equal(ghostAt([], 0), null);
});

test("trialXp: finishing pays, a personal best pays more, a record most", () => {
  assert.equal(
    trialXp({ personalBest: false, routeRecord: false }),
    TRIAL_XP.finish,
  );
  assert.equal(
    trialXp({ personalBest: true, routeRecord: false }),
    TRIAL_XP.finish + TRIAL_XP.personalBest,
  );
  assert.equal(
    trialXp({ personalBest: true, routeRecord: true }),
    TRIAL_XP.finish + TRIAL_XP.personalBest + TRIAL_XP.routeRecord,
  );
});

test("a runner named like an Object.prototype member has no inherited best", () => {
  const first = submitRun(newTrialBook(), "dock", "me", 60_000);
  assert.ok(first.ok);
  if (!first.ok) return;
  assert.equal(personalBest(first.book, "dock", "toString"), undefined);
  const r = submitRun(first.book, "dock", "toString", 70_000);
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.personalBest, true);
  assert.equal(personalBest(r.book, "dock", "toString")?.timeMs, 70_000);
  assert.equal(personalBest(first.book, "toString", "me"), undefined);
});

test("the stored ghost is a copy: editing the caller's samples does not change it", () => {
  for (const size of [3, MAX_GHOST_SAMPLES * 2]) {
    const ghost: GhostSample[] = Array.from({ length: size }, (_, i) => ({
      t: i * 100,
      x: i,
      z: 0,
      yaw: 0,
    }));
    const r = submitRun(newTrialBook(), "dock", "me", 30_000, ghost);
    assert.ok(r.ok);
    if (!r.ok) return;
    const x = personalBest(r.book, "dock", "me")?.ghost[0]?.x;
    const first = ghost[0];
    assert.ok(first);
    first.x = 999;
    assert.equal(personalBest(r.book, "dock", "me")?.ghost[0]?.x, x);
  }
});

test("ghost samples submitted out of order are stored in time order", () => {
  const ghost: GhostSample[] = [
    { t: 0, x: 0, z: 0, yaw: 0 },
    { t: 2000, x: 20, z: 0, yaw: 0 },
    { t: 1000, x: 10, z: 0, yaw: 0 },
  ];
  const r = submitRun(newTrialBook(), "dock", "me", 30_000, ghost);
  assert.ok(r.ok);
  if (!r.ok) return;
  const kept = personalBest(r.book, "dock", "me")?.ghost ?? [];
  assert.deepEqual(
    kept.map((s) => s.t),
    [0, 1000, 2000],
  );
  assert.equal(ghostAt(kept, 1500)?.x, 15);
});
