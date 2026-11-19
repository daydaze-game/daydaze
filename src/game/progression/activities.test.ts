// Activity rewards: every scored game feeds a ladder, and replayed discoveries
// or scheduled event visits cannot replay their one-time rewards.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PRIZE_GAMES, PRIZE_TABLES } from "../prizes.ts";
import { challengesFor, dayOf } from "../challenges.ts";
import { createDefaultSave, loadSave, serializeSave } from "../save.ts";
import { freshProgression, totalXp } from "./progression.ts";
import {
  GAME_LADDERS,
  finishPrize,
  rewardSteal,
  rewardVisit,
  rewardLegacy,
  rewardXp,
} from "./activities.ts";

test("every scored activity has a ladder and grades increase XP", () => {
  for (const game of PRIZE_GAMES) assert.ok(GAME_LADDERS[game]);
  for (const [grade, expected] of [
    ["C", 25],
    ["B", 45],
    ["A", 70],
    ["S", 100],
  ] as const) {
    const s = rewardLegacy(createDefaultSave("Mango"), "bassline", grade);
    assert.equal(s.progression.xp.fame, expected);
  }
  assert.equal(
    rewardLegacy(createDefaultSave("Mango"), "last-call", "A").progression.xp
      .hustle,
    70,
  );
});

test("prizes combine grade, best, daily XP and coins atomically", () => {
  const now = Date.UTC(2026, 10, 19);
  const { game, target } = challengesFor(dayOf(now))[0];
  const before = createDefaultSave("Mango");
  const result = finishPrize(before, game, target, now);
  assert.ok(result);
  const { save, xp } = result;
  assert.equal(xp, 70 + 25 + 75);
  assert.equal(totalXp(save.progression), xp);
  assert.equal(save.progression.xp[GAME_LADDERS[game]], xp);
  assert.equal(before.bests[game], undefined);
  assert.equal(before.coins + 25 + 15 + 50, save.coins);
  const again = finishPrize(save, game, target, now);
  assert.ok(again);
  assert.equal(again.xp, 70);
  assert.equal(again.save.bests[game], target);
  assert.deepEqual(again.save.challenges.done, [game]);
});

test("lower-is-better race personal bests retain their scoring", () => {
  const s = createDefaultSave("Mango");
  const first = finishPrize(s, "speedway", 3, 0);
  assert.ok(first);
  const faster = finishPrize(first.save, "speedway", 1, 0);
  assert.ok(faster);
  assert.equal(faster.prize.best, true);
  assert.equal(faster.prize.grade, "S");
  assert.equal(faster.save.bests.speedway, 1);
  const worse = finishPrize(faster.save, "speedway", 2, 0);
  assert.ok(worse);
  assert.equal(worse.prize.best, false);
  assert.equal(worse.save.bests.speedway, 1);
  assert.equal(PRIZE_TABLES.speedway.lower, true);
});

test("a newly visited place pays once, including after save round-trip", () => {
  const first = rewardVisit(createDefaultSave("Mango"), "city", 0, false);
  assert.equal(first.progression.xp.street, 30);
  assert.deepEqual(first.visited, ["city"]);
  const loaded = loadSave(serializeSave(first), "Mango");
  const again = rewardVisit(loaded, "city", 0, false);
  assert.equal(again, loaded);
  assert.equal(rewardVisit(again, "green-haze", 0, false), again);
  assert.equal(
    rewardVisit(again, "green-haze", 0, true).progression.xp.street,
    60,
  );
});

test("event attendance pays once per real occurrence across venues and reloads", () => {
  const now = Date.UTC(2026, 10, 20, 23, 15); // Friday Y2K night
  const s = createDefaultSave("Mango");
  s.visited = ["pulse", "sugar-rush"];
  const first = rewardVisit(s, "pulse", now, false);
  assert.ok(first.progression.xp.fame >= 75);
  const again = rewardVisit(
    loadSave(serializeSave(first), "Mango"),
    "sugar-rush",
    now + 60_000,
    false,
  );
  assert.equal(again.progression.xp.fame, first.progression.xp.fame);
  const next = rewardVisit(again, "pulse", now + 7 * 86400000, false);
  assert.ok(next.progression.xp.fame > first.progression.xp.fame);
});

test("old saves gain fresh progress without losing existing play", () => {
  const s = loadSave(
    JSON.stringify({
      name: "Mango",
      coins: 1234,
      bests: { hoops: 25 },
      visited: ["city"],
    }),
    "Guest",
  );
  assert.deepEqual(s.progression, freshProgression());
  assert.equal(s.coins, 1234);
  assert.equal(s.bests.hoops, 25);
  assert.equal(rewardVisit(s, "city", 0, false), s);
  const rank = rewardXp(s, "street", 800);
  assert.equal(rank.coins, 1534);
  assert.equal(rank.progression.xp.street, 800);
});

test("invalid scores cannot poison saved progress or bests", () => {
  const s = createDefaultSave("Mango");
  for (const score of [NaN, Infinity, -Infinity, 1e8])
    assert.equal(finishPrize(s, "hoops", score, 0), null);
});

test("a lift pays Street XP once per item, so re-stealing can't farm it", () => {
  const once = rewardSteal(createDefaultSave("Mango"), "tee-pink", "thrift");
  assert.equal(once.progression.xp.street, 75);
  assert.ok(once.wardrobe.includes("tee-pink"));
  const twice = rewardSteal(once, "tee-pink", "thrift");
  assert.equal(twice.progression.xp.street, 75);
});
