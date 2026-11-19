// The daily streak: consecutive days grow it, milestones pay once per run, a
// weekly freeze covers one missed day, longer gaps restart without loss of the
// best, and stored data is cleaned.
import assert from "node:assert/strict";
import test from "node:test";
import { shopItem } from "./shop.ts";
import {
  calendarFor,
  checkIn,
  cleanStreak,
  cleanXp,
  freezeReady,
  liveCount,
  MILESTONES,
  nextMilestone,
  NO_STREAK,
  weekOf,
  type StreakSave,
} from "./streak.ts";

// 20_000 is a Monday-aligned start? weekOf decides; use a known week start.
const MON = 7 * 2900 - 3; // weekOf(MON) !== weekOf(MON - 1)

function run(start: number, days: number): StreakSave {
  let s = NO_STREAK;
  for (let i = 0; i < days; i++) s = checkIn(s, start + i).streak;
  return s;
}

test("weeks start on Monday", () => {
  assert.notEqual(weekOf(MON), weekOf(MON - 1));
  assert.equal(weekOf(MON), weekOf(MON + 6));
});

test("the first check-in starts a streak, and a repeat the same day does nothing", () => {
  const a = checkIn(NO_STREAK, MON);
  assert.equal(a.streak.count, 1);
  assert.equal(a.reward, null);
  const b = checkIn(a.streak, MON);
  assert.equal(b.streak, a.streak);
});

test("consecutive days grow the streak and pay each milestone once", () => {
  let s = NO_STREAK;
  const paid: number[] = [];
  for (let i = 0; i < 30; i++) {
    const r = checkIn(s, MON + i);
    s = r.streak;
    if (r.reward) paid.push(r.milestone);
  }
  assert.deepEqual(
    paid,
    MILESTONES.map((m) => m.day),
  );
  assert.equal(s.count, 30);
  assert.equal(s.best, 30);
});

test("the day-30 reward is a real shop cosmetic", () => {
  const last = MILESTONES[MILESTONES.length - 1];
  assert.ok(last.reward.item && shopItem(last.reward.item));
});

test("one missed day is covered by the weekly freeze", () => {
  const s = run(MON, 2); // Mon, Tue
  const r = checkIn(s, MON + 3); // skipped Wed
  assert.equal(r.froze, true);
  assert.equal(r.streak.count, 3);
  assert.deepEqual(r.streak.frozen, [MON + 2]);
  assert.equal(r.milestone, 3);
});

test("a second missed day in the same week is not covered", () => {
  const s = checkIn(run(MON, 2), MON + 3).streak; // froze Wed
  const r = checkIn(s, MON + 5); // skipped Fri, same week
  assert.equal(r.froze, false);
  assert.equal(r.streak.count, 1);
  assert.equal(r.streak.best, 3);
});

test("the freeze comes back the next week", () => {
  const s = checkIn(run(MON, 2), MON + 3).streak;
  assert.equal(freezeReady(s, MON + 3), false);
  assert.equal(freezeReady(s, MON + 7), true);
  const week = run(MON + 3, 4); // Wed..Sun, restarting is fine here
  assert.equal(week.count, 4);
  let t = s;
  for (const d of [4, 5, 6]) t = checkIn(t, MON + d).streak;
  const r = checkIn(t, MON + 8); // skipped next Monday
  assert.equal(r.froze, true);
  assert.equal(r.streak.count, 7);
});

test("a gap of two or more days restarts at 1 and keeps the best", () => {
  const s = run(MON, 5);
  const r = checkIn(s, MON + 8);
  assert.equal(r.streak.count, 1);
  assert.equal(r.streak.best, 5);
  assert.equal(r.froze, false);
});

test("liveCount reads 0 once the streak can no longer be saved", () => {
  const s = run(MON, 4);
  assert.equal(liveCount(s, MON + 3), 4);
  assert.equal(liveCount(s, MON + 4), 4);
  assert.equal(liveCount(s, MON + 5), 4); // freeze still covers it
  assert.equal(liveCount(s, MON + 6), 0);
  assert.equal(liveCount(NO_STREAK, MON), 0);
});

test("nextMilestone finds the next goal, then none", () => {
  assert.equal(nextMilestone(0)?.day, 3);
  assert.equal(nextMilestone(7)?.day, 14);
  assert.equal(nextMilestone(30), null);
});

test("the calendar marks played, frozen, missed and today", () => {
  const s = checkIn(run(MON, 2), MON + 3).streak;
  const cal = calendarFor(s, MON + 4);
  assert.equal(cal.length, 28);
  const at = (d: number) => cal.find((c) => c.day === d)?.state;
  assert.equal(at(MON), "played");
  assert.equal(at(MON + 2), "frozen");
  assert.equal(at(MON + 3), "played");
  assert.equal(at(MON + 4), "today");
  assert.equal(at(MON - 5), "missed");
});

test("old days fall out of the saved calendar", () => {
  const s = run(MON, 40);
  assert.ok(s.days.length <= 28);
  assert.equal(s.days[s.days.length - 1], MON + 39);
});

test("stored streaks are cleaned, and a missing one starts afresh", () => {
  assert.deepEqual(cleanStreak(undefined), NO_STREAK);
  assert.deepEqual(cleanStreak("x"), NO_STREAK);
  const c = cleanStreak({
    last: 5.5,
    count: 4,
    best: 2,
    freezeWeek: "a",
    days: [9, "x", 3, 3, -1],
    frozen: null,
  });
  assert.equal(c.last, 0);
  assert.equal(c.best, 4);
  assert.equal(c.freezeWeek, -1);
  assert.deepEqual(c.days, [3, 9]);
  assert.deepEqual(c.frozen, []);
  const good = run(MON, 3);
  assert.deepEqual(cleanStreak(JSON.parse(JSON.stringify(good))), good);
});

test("stored XP is a non-negative whole number", () => {
  assert.equal(cleanXp(120), 120);
  assert.equal(cleanXp(-1), 0);
  assert.equal(cleanXp("9"), 0);
  assert.equal(cleanXp(undefined), 0);
});
