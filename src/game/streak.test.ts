// The daily streak: counting, milestones, the weekly freeze, the calendar and
// the save migration.
import assert from "node:assert/strict";
import test from "node:test";
import {
  checkIn,
  cleanStreak,
  flameTier,
  liveStreak,
  NO_STREAK,
  STREAK_REWARDS,
  weekOf,
  type StreakSave,
} from "./streak.ts";
import { calendar, freezeReady, nextMilestone } from "./streakCalendar.ts";

// 2026-11-16 was a Monday: day 20_773
const MON = 20_773;

function play(days: number[], from: StreakSave = NO_STREAK) {
  let save = from;
  for (const d of days) save = checkIn(save, d).save;
  return save;
}

test("weeks run Monday to Sunday", () => {
  assert.equal(new Date(MON * 86_400_000).getUTCDay(), 1);
  assert.equal(weekOf(MON), weekOf(MON + 6));
  assert.equal(weekOf(MON + 7), weekOf(MON) + 1);
  assert.equal(weekOf(MON - 1), weekOf(MON) - 1);
});

test("the first check-in starts a streak at 1", () => {
  const r = checkIn(NO_STREAK, MON);
  assert.equal(r.save.count, 1);
  assert.equal(r.fresh, true);
  assert.equal(r.broke, false);
  assert.equal(r.reward, undefined);
});

test("checking in twice in a day, or backwards in time, changes nothing", () => {
  const once = checkIn(NO_STREAK, MON).save;
  const again = checkIn(once, MON);
  assert.equal(again.fresh, false);
  assert.equal(again.save, once);
  assert.equal(checkIn(once, MON - 3).fresh, false);
});

test("consecutive days grow the streak and pay milestones once", () => {
  let save = NO_STREAK;
  const rewards: number[] = [];
  for (let i = 0; i < 31; i++) {
    const r = checkIn(save, MON + i);
    save = r.save;
    if (r.reward) rewards.push(r.reward.day);
  }
  assert.equal(save.count, 31);
  assert.equal(save.best, 31);
  assert.deepEqual(rewards, [3, 7, 14, 30]);
});

test("rewards grow with the milestone and only the last gives a cosmetic", () => {
  for (let i = 1; i < STREAK_REWARDS.length; i++) {
    assert.ok(STREAK_REWARDS[i].coins > STREAK_REWARDS[i - 1].coins);
    assert.ok(STREAK_REWARDS[i].xp > STREAK_REWARDS[i - 1].xp);
  }
  assert.deepEqual(
    STREAK_REWARDS.filter((r) => r.item).map((r) => r.day),
    [30],
  );
  assert.equal(nextMilestone(0)?.day, 3);
  assert.equal(nextMilestone(7)?.day, 14);
  assert.equal(nextMilestone(30), undefined);
});

test("one missed day is covered by the weekly freeze", () => {
  const save = play([MON, MON + 1]);
  const r = checkIn(save, MON + 3); // missed Wednesday
  assert.equal(r.froze, true);
  assert.equal(r.broke, false);
  assert.equal(r.save.count, 3);
  assert.deepEqual(r.save.frozen, [MON + 2]);
  assert.equal(r.reward?.day, 3);
});

test("the freeze is once a week, then a miss starts over without fuss", () => {
  const first = checkIn(play([MON, MON + 1]), MON + 3).save;
  // Friday is missed in the same week: the freeze is spent
  const second = checkIn(first, MON + 5);
  assert.equal(second.froze, false);
  assert.equal(second.broke, true);
  assert.equal(second.save.count, 1);
  // best is kept
  assert.equal(second.save.best, 3);
});

test("the freeze comes back the next week", () => {
  const spent = checkIn(play([MON, MON + 1]), MON + 3).save;
  const next = play([MON + 4, MON + 5, MON + 6, MON + 7], spent);
  const r = checkIn(next, MON + 9); // missed day MON + 8, a new week
  assert.equal(r.froze, true);
  assert.equal(r.save.count, 8);
});

test("two or more missed days break the streak, even with the freeze", () => {
  const r = checkIn(play([MON, MON + 1]), MON + 4);
  assert.equal(r.froze, false);
  assert.equal(r.broke, true);
  assert.equal(r.save.count, 1);
  assert.equal(r.save.best, 2);
});

test("liveStreak shows the count only while it can still be kept", () => {
  const save = play([MON, MON + 1]);
  assert.equal(liveStreak(save, MON + 1), 2);
  assert.equal(liveStreak(save, MON + 2), 2);
  assert.equal(liveStreak(save, MON + 3), 2); // the freeze will cover MON + 2
  assert.equal(liveStreak(save, MON + 4), 0);
  assert.equal(liveStreak(NO_STREAK, MON), 0);
  const spent = checkIn(save, MON + 3).save;
  assert.equal(liveStreak(spent, MON + 4), 3);
  // Friday is missed in the same week: the freeze is spent
  assert.equal(liveStreak(spent, MON + 5), 0);
});

test("the freeze is ready until it is spent in a week", () => {
  const spent = checkIn(play([MON, MON + 1]), MON + 3).save;
  assert.equal(freezeReady(NO_STREAK, MON), true);
  assert.equal(freezeReady(spent, MON + 4), false);
  assert.equal(freezeReady(spent, MON + 7), true);
});

test("the calendar shows 30 days, oldest first, lit and frozen marked", () => {
  const save = checkIn(play([MON, MON + 1]), MON + 3).save;
  const cal = calendar(save, MON + 3);
  assert.equal(cal.length, 30);
  assert.equal(cal[29].day, MON + 3);
  assert.equal(cal[0].day, MON + 3 - 29);
  assert.equal(cal[29].state, "lit");
  assert.equal(cal[28].state, "frozen");
  assert.equal(cal[27].state, "lit");
  assert.equal(cal[0].state, "missed");
  // before today's check-in the last cell waits
  assert.equal(calendar(play([MON]), MON + 1)[29].state, "today");
});

test("old days fall out of the stored calendar", () => {
  const save = play([MON, MON + 40]);
  assert.deepEqual(save.days, [MON + 40]);
});

test("the flame grows with the streak", () => {
  const tiers = [0, 1, 2, 3, 7, 14, 30, 99].map(flameTier);
  assert.deepEqual(tiers, [0, 1, 1, 2, 3, 4, 5, 5]);
});

test("a stored streak keeps valid fields, and anything malformed starts afresh", () => {
  assert.deepEqual(cleanStreak(undefined), NO_STREAK);
  assert.deepEqual(cleanStreak("x"), NO_STREAK);
  assert.deepEqual(cleanStreak({}), NO_STREAK);
  const good = play([MON, MON + 1, MON + 2]);
  assert.deepEqual(cleanStreak(JSON.parse(JSON.stringify(good))), good);
  const bad = cleanStreak({
    count: -4,
    best: "lots",
    last: 2.5,
    days: [MON + 1, "x", MON, MON, -1, 1.5],
    frozen: 9,
    freezeWeek: "now",
  });
  assert.deepEqual(bad, {
    count: 0,
    best: 0,
    last: 0,
    days: [MON, MON + 1],
    frozen: [],
    freezeWeek: -1,
  });
  // a count with no last day cannot be live
  assert.equal(cleanStreak({ count: 9, last: 0 }).count, 0);
});
