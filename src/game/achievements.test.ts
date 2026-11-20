// Achievements: the catalog is big, unique and reachable, and the reducers and
// newlyUnlocked behave.
import assert from "node:assert/strict";
import test from "node:test";
import {
  ACTION_XP,
  bump,
  cleanStats,
  displayed,
  newlyUnlocked,
  NO_STATS,
  raiseTo,
  TIER_XP,
  unlockedIn,
  unlockXp,
  xpFor,
} from "./achievements.ts";
import { ACHIEVEMENTS } from "./achievementCatalog.ts";
import { STAT_KEYS } from "./achievementTypes.ts";

test("the catalog has 100+ achievements with unique ids", () => {
  assert.ok(ACHIEVEMENTS.length >= 100);
  assert.equal(
    new Set(ACHIEVEMENTS.map((a) => a.id)).size,
    ACHIEVEMENTS.length,
  );
});

test("every achievement has handwritten text and unique titles", () => {
  for (const a of ACHIEVEMENTS) {
    assert.ok(a.title.trim().length > 0, a.id);
    assert.ok(a.description.trim().length > 0, a.id);
    assert.ok(a.tier in TIER_XP, a.id);
  }
  assert.equal(
    new Set(ACHIEVEMENTS.map((a) => a.title)).size,
    ACHIEVEMENTS.length,
  );
});

test("every condition is reachable: hitting it unlocks it, one short does not", () => {
  for (const a of ACHIEVEMENTS) {
    assert.ok(Number.isInteger(a.when.atLeast) && a.when.atLeast >= 1, a.id);
    const at = { ...NO_STATS, [a.when.stat]: a.when.atLeast };
    assert.ok(unlockedIn(at).includes(a), a.id);
    const below = { ...NO_STATS, [a.when.stat]: a.when.atLeast - 1 };
    assert.ok(!unlockedIn(below).includes(a), a.id);
  }
});

test("every stat feeds XP and at least one achievement", () => {
  for (const key of STAT_KEYS) {
    assert.ok(key in ACTION_XP, key);
    assert.ok(
      ACHIEVEMENTS.some((a) => a.when.stat === key),
      `${key} has no achievement`,
    );
  }
});

test("every activity family has achievements, and some are secret", () => {
  for (const key of [
    "gamesPlayed",
    "placesVisited",
    "karaokeSongs",
    "fishCaught",
    "cropsHarvested",
    "milesDriven",
    "eventsAttended",
    "crimesCommitted",
  ] as const)
    assert.ok(ACHIEVEMENTS.filter((a) => a.when.stat === key).length >= 3, key);
  assert.ok(ACHIEVEMENTS.filter((a) => a.hidden).length >= 10);
});

test("newlyUnlocked lists only what the step crossed", () => {
  assert.deepEqual(newlyUnlocked(NO_STATS, NO_STATS), []);
  const next = bump(NO_STATS, "fishCaught");
  const got = newlyUnlocked(NO_STATS, next);
  assert.ok(got.length >= 1);
  assert.ok(got.every((a) => a.when.stat === "fishCaught"));
  assert.deepEqual(newlyUnlocked(next, next), []);
  assert.deepEqual(newlyUnlocked(next, NO_STATS), []);
});

test("a jump crosses several thresholds at once", () => {
  const got = newlyUnlocked(NO_STATS, { ...NO_STATS, gamesPlayed: 1000 });
  assert.ok(got.length >= 3);
});

test("bump and raiseTo only go up and never mutate", () => {
  const a = bump(NO_STATS, "gamesWon", 3);
  assert.equal(a.gamesWon, 3);
  assert.equal(NO_STATS.gamesWon, 0);
  assert.equal(bump(a, "gamesWon", -5).gamesWon, 3);
  assert.equal(bump(a, "gamesWon", NaN).gamesWon, 3);
  assert.equal(raiseTo(a, "placesVisited", 4).placesVisited, 4);
  assert.equal(
    raiseTo(raiseTo(a, "placesVisited", 4), "placesVisited", 2).placesVisited,
    4,
  );
});

test("cleanStats drops junk from storage", () => {
  const s = cleanStats({
    gamesWon: 7.9,
    fishCaught: -2,
    nope: 5,
    daysPlayed: "x",
  });
  assert.equal(s.gamesWon, 7);
  assert.equal(s.fishCaught, 0);
  assert.equal(s.daysPlayed, 0);
  assert.equal("nope" in s, false);
  assert.deepEqual(cleanStats(null), NO_STATS);
  assert.deepEqual(cleanStats("x"), NO_STATS);
});

test("xp is data: scaled by amount, never negative", () => {
  assert.equal(xpFor("gamesWon", 4).xp, 4 * ACTION_XP.gamesWon.xp);
  assert.equal(xpFor("gamesWon", -3).xp, 0);
  assert.equal(xpFor("fishCaught").ladder, "hustle");
  assert.equal(unlockXp([]), 0);
  assert.ok(unlockXp(ACHIEVEMENTS) > 0);
});

test("secrets stay masked until unlocked", () => {
  const secret = ACHIEVEMENTS.find((a) => a.hidden);
  const plain = ACHIEVEMENTS.find((a) => !a.hidden);
  assert.ok(secret && plain);
  assert.equal(displayed(secret, false).title, "???");
  assert.equal(displayed(secret, true).title, secret.title);
  assert.equal(displayed(plain, false).title, plain.title);
});
