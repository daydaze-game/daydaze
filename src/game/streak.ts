// The daily streak: open the game on consecutive (UTC) days to grow a counter,
// with rewards at days 3, 7, 14 and 30 (coins, XP, a cosmetic at 30). One free
// streak freeze a week quietly covers a single missed day, so a lost day is
// never punishing. Rewards only add: nothing here locks anything that is free.
// Days are challenges.ts `dayOf` numbers. Pure.

import type { StreakSave } from "./streakSave.ts";

export { cleanStreak, NO_STREAK, type StreakSave } from "./streakSave.ts";

export const CALENDAR_DAYS = 30;
const WEEK_DAYS = 7;
/** Unix day 0 was a Thursday; shifting by 3 starts each week on a Monday. */
const MONDAY_SHIFT = 3;

export type StreakReward = {
  /** The streak length that earns it. */
  day: number;
  coins: number;
  xp: number;
  /** A wardrobe item (look.ts option id), only at the top milestone. */
  item?: string;
};

export const STREAK_REWARDS: readonly StreakReward[] = [
  { day: 3, coins: 25, xp: 20 },
  { day: 7, coins: 75, xp: 60 },
  { day: 14, coins: 150, xp: 120 },
  { day: 30, coins: 400, xp: 300, item: "glam-faux-fur" },
];

/** The Monday-to-Sunday week a day falls in. */
export function weekOf(day: number): number {
  return Math.floor((day + MONDAY_SHIFT) / WEEK_DAYS);
}

/** Whether this week's free freeze is still unspent for a missed `day`. */
export function freezeFree(save: StreakSave, missed: number): boolean {
  return save.freezeWeek !== weekOf(missed);
}

/** The reward earned on reaching `count` days, if it is a milestone. */
export function rewardFor(count: number): StreakReward | undefined {
  return STREAK_REWARDS.find((r) => r.day === count);
}

export type CheckIn = {
  save: StreakSave;
  /** The milestone reached by this check-in, if any. */
  reward?: StreakReward | undefined;
  /** Whether a freeze covered a missed day to keep the streak. */
  froze: boolean;
  /** Whether the streak ran out and started over at 1. */
  broke: boolean;
  /** Whether this was the first check-in of `day` (false: nothing changed). */
  fresh: boolean;
};

function recent(days: readonly number[], today: number): number[] {
  return days.filter((d) => d > today - CALENDAR_DAYS && d <= today);
}

/**
 * Counts `day` as played. The same day again, or a clock that went backwards,
 * changes nothing. After one missed day the weekly freeze (if unspent) keeps
 * the streak; otherwise it starts over at 1.
 */
export function checkIn(save: StreakSave, day: number): CheckIn {
  if (day <= save.last)
    return { save, froze: false, broke: false, fresh: false };
  const gap = save.last === 0 ? 0 : day - save.last;
  let count = 1;
  let froze = false;
  let broke = false;
  let frozen = save.frozen;
  let freezeWeek = save.freezeWeek;
  if (gap === 1) {
    count = save.count + 1;
  } else if (gap === 2 && freezeFree(save, day - 1)) {
    count = save.count + 1;
    froze = true;
    frozen = [...frozen, day - 1];
    freezeWeek = weekOf(day - 1);
  } else if (gap > 1) {
    broke = save.count > 0;
  }
  const next: StreakSave = {
    count,
    best: Math.max(save.best, count),
    last: day,
    days: recent([...save.days, day], day),
    frozen: recent(frozen, day),
    freezeWeek,
  };
  return { save: next, reward: rewardFor(count), froze, broke, fresh: true };
}

/**
 * The streak to show on `today`: the count while it is alive (played today or
 * yesterday, or one missed day the freeze will cover), else 0.
 */
export function liveStreak(save: StreakSave, today: number): number {
  if (save.count === 0) return 0;
  const gap = today - save.last;
  if (gap <= 1) return save.count;
  if (gap === 2 && freezeFree(save, today - 1)) return save.count;
  return 0;
}

/** How big the flame burns, 0 (none) to 5 (a month or more). */
export function flameTier(count: number): number {
  if (count <= 0) return 0;
  if (count < 3) return 1;
  if (count < 7) return 2;
  if (count < 14) return 3;
  if (count < 30) return 4;
  return 5;
}
