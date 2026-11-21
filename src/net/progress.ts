// What the server says about an account's progress: totals, what a score or a
// visit paid, and the weekly boards. Every reply is validated before use, like
// the rest of the API (see client/api.ts); anything off is refused as null.

import { LADDERS, type Ladder } from "../game/progression/progression.ts";
import type { PayGrade } from "../game/wallet.ts";

/** The server's numbers for the signed-in account. */
export type ServerProgress = {
  xp: Record<Ladder, number>;
  /** "<ladder>:<rank>", or null. */
  title: string | null;
  /** Score XP the daily cap still allows today. */
  dailyXpLeft: number;
};
/** A graded minigame: what the server decided it was worth. */
export type ScoreOutcome = ServerProgress & {
  grade: PayGrade;
  ladder: Ladder;
  /** XP actually added, after the daily cap. */
  gained: number;
  /** A new all-time personal best. */
  best: boolean;
  /** The daily cap cut the award short (possibly to nothing). */
  capped: boolean;
};
/** A first visit to a place: Street XP once, then nothing. */
export type VisitOutcome = ServerProgress & { ladder: Ladder; gained: number };
/** One line of a weekly board; `value` is a score or an XP total. */
export type BoardEntry = { rank: number; name: string; value: number };
/** A weekly board. `you` is the caller's own line, null before they have one. */
export type Board = {
  week: number;
  /** When the week began and ends, in ms, for the reset countdown. */
  startsAt: number;
  endsAt: number;
  entries: BoardEntry[];
  you: { rank: number; value: number } | null;
};

const GRADES: readonly PayGrade[] = ["S", "A", "B", "C"];
/** A board never lists more than this many lines. */
const MAX_ENTRIES = 100;

function fields(value: unknown): Map<string, unknown> {
  return new Map(
    typeof value === "object" && value !== null ? Object.entries(value) : [],
  );
}
function whole(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}
function isLadder(value: unknown): value is Ladder {
  return LADDERS.some((ladder) => ladder === value);
}
function isGrade(value: unknown): value is PayGrade {
  return GRADES.some((grade) => grade === value);
}

/** `GET /api/progress`, and the totals inside every other progress reply. */
export function parseProgress(value: unknown): ServerProgress | null {
  const f = fields(value);
  const xp = fields(f.get("xp"));
  const street = xp.get("street");
  const fame = xp.get("fame");
  const hustle = xp.get("hustle");
  const title = f.get("title");
  const dailyXpLeft = f.get("dailyXpLeft");
  return whole(street) &&
    whole(fame) &&
    whole(hustle) &&
    (title === null || typeof title === "string") &&
    whole(dailyXpLeft)
    ? { xp: { street, fame, hustle }, title, dailyXpLeft }
    : null;
}

/** `POST /api/progress/score`. */
export function parseScoreOutcome(value: unknown): ScoreOutcome | null {
  const progress = parseProgress(value);
  const f = fields(value);
  const grade = f.get("grade");
  const ladder = f.get("ladder");
  const gained = f.get("gained");
  const best = f.get("best");
  const capped = f.get("capped");
  return progress &&
    isGrade(grade) &&
    isLadder(ladder) &&
    whole(gained) &&
    typeof best === "boolean" &&
    typeof capped === "boolean"
    ? { ...progress, grade, ladder, gained, best, capped }
    : null;
}

/** `POST /api/progress/visit`. */
export function parseVisitOutcome(value: unknown): VisitOutcome | null {
  const progress = parseProgress(value);
  const f = fields(value);
  const ladder = f.get("ladder");
  const gained = f.get("gained");
  return progress && isLadder(ladder) && whole(gained)
    ? { ...progress, ladder, gained }
    : null;
}

/** `GET /api/leaderboard/...`: a malformed line refuses the whole board. */
export function parseBoard(value: unknown): Board | null {
  const f = fields(value);
  const week = f.get("week");
  const startsAt = f.get("startsAt");
  const endsAt = f.get("endsAt");
  const list = f.get("entries");
  if (
    !whole(week) ||
    !whole(startsAt) ||
    !whole(endsAt) ||
    !Array.isArray(list) ||
    list.length > MAX_ENTRIES
  )
    return null;
  const entries: BoardEntry[] = [];
  for (const item of list) {
    const e = fields(item);
    const rank = e.get("rank");
    const name = e.get("name");
    const score = e.get("value");
    if (
      !whole(rank) ||
      rank < 1 ||
      typeof name !== "string" ||
      name === "" ||
      name.length > 64 ||
      typeof score !== "number" ||
      !Number.isFinite(score)
    )
      return null;
    entries.push({ rank, name, value: score });
  }
  const mine = f.get("you");
  if (mine === null) return { week, startsAt, endsAt, entries, you: null };
  const y = fields(mine);
  const rank = y.get("rank");
  const score = y.get("value");
  return whole(rank) &&
    rank >= 1 &&
    typeof score === "number" &&
    Number.isFinite(score)
    ? { week, startsAt, endsAt, entries, you: { rank, value: score } }
    : null;
}
