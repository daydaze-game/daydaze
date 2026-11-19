// The daily streak: log in on consecutive (UTC) days to grow it, with rewards
// at days 3, 7, 14 and 30 and one free streak freeze a week that covers a
// single missed day. A longer break restarts the count (the best is kept), and
// nothing is ever taken away. Rewards are coins, XP and one cosmetic. Pure.

import { dayOf } from "./challenges.ts";

export { dayOf };

export type StreakReward = {
  coins: number;
  xp: number;
  /** A shop item id granted for free, if any. */
  item?: string;
};

/** Streak lengths that pay out, and what each pays. */
export const MILESTONES: readonly { day: number; reward: StreakReward }[] = [
  { day: 3, reward: { coins: 30, xp: 20 } },
  { day: 7, reward: { coins: 75, xp: 50 } },
  { day: 14, reward: { coins: 150, xp: 100 } },
  { day: 30, reward: { coins: 400, xp: 250, item: "opal-stud" } },
];

/** Calendar days kept in the save (and shown). */
export const CALENDAR_DAYS = 28;

export type StreakSave = {
  /** The last day (`dayOf`) counted; 0 before the first check-in. */
  last: number;
  /** Current streak length. */
  count: number;
  /** Longest streak ever. */
  best: number;
  /** The week (`weekOf`) of the day the last freeze covered; -1 for never. */
  freezeWeek: number;
  /** Recent days checked in, ascending. */
  days: number[];
  /** Recent days a freeze covered, ascending. */
  frozen: number[];
};

export const NO_STREAK: StreakSave = {
  last: 0,
  count: 0,
  best: 0,
  freezeWeek: -1,
  days: [],
  frozen: [],
};

/** The Monday-based week a day falls in (day 0 was a Thursday). */
export function weekOf(day: number): number {
  return Math.floor((day + 3) / 7);
}

export type CheckIn = {
  streak: StreakSave;
  /** A milestone reached by this check-in, else null. */
  reward: StreakReward | null;
  /** The milestone day reached, else 0. */
  milestone: number;
  /** Whether a freeze covered a missed day. */
  froze: boolean;
};

function recent(list: readonly number[], today: number): number[] {
  return list.filter((d) => d > today - CALENDAR_DAYS && d <= today);
}

/** Counts `today` into the streak (once a day). A single missed day is
 * covered by the week's free freeze; a longer gap restarts at 1. */
export function checkIn(streak: StreakSave, today: number): CheckIn {
  if (streak.last >= today)
    return { streak, reward: null, milestone: 0, froze: false };
  const gap = today - streak.last;
  const missed = streak.last + 1;
  let count = 1;
  let froze = false;
  let freezeWeek = streak.freezeWeek;
  const frozen = [...streak.frozen];
  if (streak.last > 0 && gap === 1) {
    count = streak.count + 1;
  } else if (
    streak.last > 0 &&
    gap === 2 &&
    streak.freezeWeek !== weekOf(missed)
  ) {
    count = streak.count + 1;
    froze = true;
    freezeWeek = weekOf(missed);
    frozen.push(missed);
  }
  const hit = MILESTONES.find((m) => m.day === count);
  return {
    streak: {
      last: today,
      count,
      best: Math.max(streak.best, count),
      freezeWeek,
      days: recent([...streak.days, today], today),
      frozen: recent(frozen, today),
    },
    reward: hit ? hit.reward : null,
    milestone: hit ? hit.day : 0,
    froze,
  };
}

/** The streak as it stands today for display: a streak with more than one
 * unfreezable day missed reads 0 until the next check-in restarts it. */
export function liveCount(streak: StreakSave, today: number): number {
  if (streak.last === today || streak.last === today - 1) return streak.count;
  if (
    streak.last === today - 2 &&
    streak.last > 0 &&
    streak.freezeWeek !== weekOf(streak.last + 1)
  )
    return streak.count;
  return 0;
}

/** Whether this week's free freeze is still unused. */
export function freezeReady(streak: StreakSave, today: number): boolean {
  return streak.freezeWeek !== weekOf(today);
}

/** The next milestone above `count`, or null after the last. */
export function nextMilestone(
  count: number,
): { day: number; reward: StreakReward } | null {
  return MILESTONES.find((m) => m.day > count) ?? null;
}

export type CalendarState = "played" | "frozen" | "missed" | "today";

/** The last `CALENDAR_DAYS` days, oldest first, each with what happened. */
export function calendarFor(
  streak: StreakSave,
  today: number,
): { day: number; state: CalendarState }[] {
  const out: { day: number; state: CalendarState }[] = [];
  for (let day = today - CALENDAR_DAYS + 1; day <= today; day++) {
    let state: CalendarState = "missed";
    if (streak.days.includes(day)) state = "played";
    else if (streak.frozen.includes(day)) state = "frozen";
    else if (day === today) state = "today";
    out.push({ day, state });
  }
  return out;
}

function ints(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const out = new Set<number>();
  for (const v of value)
    if (typeof v === "number" && Number.isInteger(v) && v > 0) out.add(v);
  return [...out].sort((a, b) => a - b).slice(-CALENDAR_DAYS);
}

function nat(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : 0;
}

/** The streak record from storage; anything malformed starts afresh. */
export function cleanStreak(value: unknown): StreakSave {
  if (typeof value !== "object" || value === null) return { ...NO_STREAK };
  const count = nat(Reflect.get(value, "count"));
  const fw: unknown = Reflect.get(value, "freezeWeek");
  return {
    last: nat(Reflect.get(value, "last")),
    count,
    best: Math.max(nat(Reflect.get(value, "best")), count),
    freezeWeek:
      typeof fw === "number" && Number.isInteger(fw) && fw >= 0 ? fw : -1,
    days: ints(Reflect.get(value, "days")),
    frozen: ints(Reflect.get(value, "frozen")),
  };
}

/** Experience points from storage: a non-negative whole number. */
export function cleanXp(value: unknown): number {
  return nat(value);
}
