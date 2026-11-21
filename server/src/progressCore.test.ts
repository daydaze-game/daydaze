// Tests for server/src/progressCore.ts: the server's rules for XP, daily caps,
// personal bests, weekly boards and the first import of a local save.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PRIZE_GAMES, PRIZE_TABLES } from "../../src/game/prizes.ts";
import { GAME_LADDERS } from "../../src/game/progression/activities.ts";
import { createDefaultSave } from "../../src/game/save.ts";
import {
  applyScore,
  applyTitle,
  applyVisit,
  DAILY_XP_CAP,
  freshState,
  isPlausibleScore,
  parseProgressRow,
  progressionOf,
  seedState,
  VISIT_XP,
  weekOf,
  weekStartMs,
} from "./progressCore.ts";

const DAY = 86_400_000;
// A Wednesday, noon UTC.
const NOW = Date.UTC(2026, 10, 18, 12);

test("weeks run Monday to Sunday in UTC", () => {
  const monday = Date.UTC(2026, 10, 16);
  assert.equal(weekOf(monday), weekOf(monday + 6 * DAY + 86_399_999));
  assert.equal(weekOf(monday + 7 * DAY), weekOf(monday) + 1);
  assert.equal(weekOf(monday - 1), weekOf(monday) - 1);
});

test("a week starts at Monday 00:00 UTC", () => {
  const monday = Date.UTC(2026, 10, 16);
  assert.equal(weekStartMs(weekOf(monday + 3 * DAY)), monday);
  assert.equal(weekOf(weekStartMs(weekOf(NOW))), weekOf(NOW));
});

test("the server grades a score itself and pays its ladder", () => {
  const result = applyScore(freshState(), "bowling", 185, NOW);
  assert.ok(result);
  assert.equal(result.grade, "S");
  assert.equal(result.best, true);
  assert.equal(result.xp, 125);
  assert.equal(result.ladder, GAME_LADDERS.bowling);
  assert.equal(result.state.xp.fame, 125);
  assert.equal(result.state.bests.bowling, 185);
});

test("a worse score pays the grade only and keeps the best", () => {
  const first = applyScore(freshState(), "bowling", 185, NOW);
  assert.ok(first);
  const again = applyScore(first.state, "bowling", 100, NOW);
  assert.ok(again);
  assert.equal(again.best, false);
  assert.equal(again.xp, 45);
  assert.equal(again.state.bests.bowling, 185);
});

test("lower-is-better games keep the lowest score as the best", () => {
  const first = applyScore(freshState(), "mini-golf", 1, NOW);
  assert.ok(first);
  const worse = applyScore(first.state, "mini-golf", 4, NOW);
  assert.ok(worse);
  assert.equal(worse.best, false);
  const better = applyScore(first.state, "mini-golf", -1, NOW);
  assert.ok(better);
  assert.equal(better.best, true);
  assert.equal(better.state.bests["mini-golf"], -1);
});

test("implausible scores are refused", () => {
  const s = freshState();
  for (const score of [NaN, Infinity, -Infinity, 1e9, 9_999_999])
    assert.equal(applyScore(s, "hoops", score, NOW), null);
  // far past the S bar, or a better-than-possible time or place
  assert.equal(applyScore(s, "hoops", 500, NOW), null);
  assert.equal(applyScore(s, "speedway", 0, NOW), null);
  assert.equal(applyScore(s, "speed-slide", 10, NOW), null);
  assert.equal(applyScore(s, "mini-golf", -40, NOW), null);
  assert.equal(applyScore(s, "bowling", -5, NOW), null);
});

test("every game's own grade bars are plausible scores", () => {
  for (const game of PRIZE_GAMES)
    for (const bar of PRIZE_TABLES[game].grades)
      assert.ok(isPlausibleScore(game, bar), `${game} ${bar}`);
});

test("score XP stops at the daily cap, then resumes the next day", () => {
  let state = freshState();
  let paid = 0;
  // enough 125 XP games to pass the cap
  for (let i = 0; i < DAILY_XP_CAP / 100; i++) {
    const r = applyScore(state, "bowling", 200 + i, NOW);
    assert.ok(r);
    paid += r.xp;
    state = r.state;
  }
  assert.equal(paid, DAILY_XP_CAP);
  const capped = applyScore(state, "bowling", 900, NOW);
  assert.ok(capped);
  assert.equal(capped.xp, 0);
  assert.equal(capped.capped, true);
  // the best still counts for the boards even when no XP is paid
  assert.equal(capped.state.bests.bowling, 900);
  const next = applyScore(capped.state, "bowling", 901, NOW + DAY);
  assert.ok(next);
  assert.equal(next.xp, 125);
  assert.equal(next.capped, false);
});

test("a request that straddles midnight never moves the day backward", () => {
  const tomorrow = {
    ...freshState(),
    day: Math.floor(NOW / DAY) + 1,
    dayXp: 4950,
  };
  const r = applyScore(tomorrow, "bowling", 185, NOW);
  assert.ok(r);
  assert.equal(r.state.day, tomorrow.day);
  assert.equal(r.xp, 50);
  assert.equal(r.state.dayXp, DAILY_XP_CAP);
});

test("a place pays Street XP once, and never an album-less room", () => {
  const first = applyVisit(freshState(), "plaza");
  assert.equal(first.xp, VISIT_XP);
  assert.equal(first.ladder, "street");
  assert.deepEqual(first.state.visited, ["plaza"]);
  assert.equal(first.state.xp.street, VISIT_XP);
  assert.equal(applyVisit(first.state, "plaza").xp, 0);
  assert.equal(applyVisit(freshState(), "jail").xp, 0);
});

test("a visit to an 18+ room pays nothing", () => {
  assert.equal(applyVisit(freshState(), "green-haze").xp, 0);
});

test("a title is accepted only once its rank is earned", () => {
  const fresh = freshState();
  assert.equal(applyTitle(fresh, "street:2"), null);
  assert.equal(applyTitle(fresh, "nonsense"), null);
  assert.equal(applyTitle(fresh, "street:0")?.title, "street:0");
  const earned = { ...fresh, xp: { ...fresh.xp, street: 800 } };
  assert.equal(applyTitle(earned, "street:2")?.title, "street:2");
  assert.equal(applyTitle({ ...earned, title: "street:2" }, null)?.title, null);
});

test("progressionOf is a valid Progression carrying the client's events", () => {
  const state = { ...freshState(), xp: { street: 5, fame: 6, hustle: 7 } };
  const p = progressionOf(state, { "y2k-night": 99 });
  assert.deepEqual(p.xp, state.xp);
  assert.equal(p.version, 1);
});

test("a first-time account is seeded from its cloud save, once", () => {
  const save = createDefaultSave("Mango");
  save.progression.xp.fame = 300;
  save.visited = ["plaza"];
  save.bests = { bowling: 150 };
  const state = seedState(save);
  assert.equal(state.xp.fame, 300);
  assert.deepEqual(state.visited, ["plaza"]);
  assert.deepEqual(state.bests, { bowling: 150 });
  assert.equal(state.dayXp, 0);
  assert.deepEqual(seedState(null), freshState());
});

test("a stored row parses; a damaged one is rejected", () => {
  const row = {
    street_xp: 1,
    fame_xp: 2,
    hustle_xp: 3,
    title: "street:0",
    visited: '["plaza","nowhere"]',
    bests: '{"bowling":150,"nope":1}',
    day: 20_000,
    day_xp: 40,
    rev: 3,
  };
  const parsed = parseProgressRow(row);
  assert.ok(parsed);
  assert.deepEqual(parsed.state.xp, { street: 1, fame: 2, hustle: 3 });
  assert.deepEqual(parsed.state.visited, ["plaza"]);
  assert.deepEqual(parsed.state.bests, { bowling: 150 });
  assert.equal(parsed.rev, 3);
  for (const bad of [
    null,
    { ...row, street_xp: -1 },
    { ...row, fame_xp: 1.5 },
    { ...row, day_xp: "x" },
    { ...row, rev: null },
  ])
    assert.equal(parseProgressRow(bad), null);
  // bad JSON columns fall back to empty rather than rejecting the account
  assert.deepEqual(
    parseProgressRow({ ...row, visited: "{", bests: "7" })?.state.visited,
    [],
  );
});
