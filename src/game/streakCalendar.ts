// What the streak panel shows beyond the streak itself: the next milestone,
// whether the weekly freeze is ready, and the 30-day calendar. Split from
// streak.ts so these ship with the lazy panel. Pure.

import {
  CALENDAR_DAYS,
  freezeFree,
  STREAK_REWARDS,
  type StreakReward,
  type StreakSave,
} from "./streak.ts";

/** The next milestone above `count`, or undefined past the last one. */
export function nextMilestone(count: number): StreakReward | undefined {
  return STREAK_REWARDS.find((r) => r.day > count);
}

/** Whether the freeze is ready for a day missed on or before `today`. */
export function freezeReady(save: StreakSave, today: number): boolean {
  return freezeFree(save, today);
}

export type DayState = "lit" | "frozen" | "today" | "missed";

export type CalendarDay = { day: number; state: DayState };

/** The last CALENDAR_DAYS days ending on `today`, oldest first. */
export function calendar(save: StreakSave, today: number): CalendarDay[] {
  const out: CalendarDay[] = [];
  for (let i = CALENDAR_DAYS - 1; i >= 0; i--) {
    const day = today - i;
    let state: DayState = "missed";
    if (save.days.includes(day)) state = "lit";
    else if (save.frozen.includes(day)) state = "frozen";
    else if (day === today) state = "today";
    out.push({ day, state });
  }
  return out;
}
