// The saved daily streak: its shape, the empty record and the check that
// cleans one read from storage. Split from streak.ts (the rules) so the save
// loads without them; they are fetched on demand. Pure.

export type StreakSave = {
  /** Days in a row, counting the last check-in. */
  count: number;
  /** The longest streak so far. */
  best: number;
  /** The day of the last check-in; 0 when there has been none. */
  last: number;
  /** Recent check-in days (the last 30 days), oldest first. */
  days: number[];
  /** Recent days a streak freeze covered, oldest first. */
  frozen: number[];
  /** The week (`weekOf`) the freeze was last spent in; -1 when never. */
  freezeWeek: number;
};

export const NO_STREAK: StreakSave = {
  count: 0,
  best: 0,
  last: 0,
  days: [],
  frozen: [],
  freezeWeek: -1,
};

function cleanDays(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const days: number[] = [];
  for (const v of value) {
    if (typeof v === "number" && Number.isInteger(v) && v > 0) days.push(v);
  }
  return [...new Set(days)].sort((a, b) => a - b);
}

function cleanCount(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : 0;
}

/** The streak record from storage; saves from before streaks, and anything
 * malformed, start with none. */
export function cleanStreak(value: unknown): StreakSave {
  if (typeof value !== "object" || value === null) return { ...NO_STREAK };
  const last = cleanCount(Reflect.get(value, "last"));
  const count = last === 0 ? 0 : cleanCount(Reflect.get(value, "count"));
  const week: unknown = Reflect.get(value, "freezeWeek");
  return {
    count,
    best: Math.max(count, cleanCount(Reflect.get(value, "best"))),
    last,
    days: cleanDays(Reflect.get(value, "days")),
    frozen: cleanDays(Reflect.get(value, "frozen")),
    freezeWeek: typeof week === "number" && Number.isInteger(week) ? week : -1,
  };
}
