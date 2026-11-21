// The server's rules for progress: who earned how much XP and where. The
// client reports what happened (a score, a place); the server grades it with
// the same pure rules the game uses, caps what a day can pay, and keeps the
// numbers that feed the weekly boards. Pure: the D1 adapter lives in
// progressStore.ts.

import { mayEnter } from "../../src/game/age.ts";
import { dayOf } from "../../src/game/challenges.ts";
import { visit } from "../../src/game/collections.ts";
import {
  cleanBests,
  PRIZE_TABLES,
  prizeFor,
  type Bests,
  type PrizeGame,
} from "../../src/game/prizes.ts";
import { isRoomId, type RoomId } from "../../src/game/rooms.ts";
import {
  GAME_LADDERS,
  prizeXp,
} from "../../src/game/progression/activities.ts";
import {
  addXp,
  cleanProgression,
  selectTitle,
  type Ladder,
  type Progression,
} from "../../src/game/progression/progression.ts";
import type { SaveV1 } from "../../src/game/save.ts";
import type { PayGrade } from "../../src/game/wallet.ts";

/**
 * Most XP finished games pay in one UTC day. About twenty minutes of
 * non-stop S grades, so play is never throttled but a script is.
 */
export const DAILY_XP_CAP = 5000;
/** Street XP for the first visit to a place; matches the client's reward. */
export const VISIT_XP = 30;
const DAY_MS = 86_400_000;
/** A score past this many times the S bar is a forgery, not a good run. */
const PLAUSIBLE_FACTOR = 10;

/** Everything the server keeps for one account's progress. */
export type ProgressState = {
  xp: Record<Ladder, number>;
  /** "<ladder>:<rank>", or null for none. */
  title: string | null;
  visited: RoomId[];
  /** All-time bests, which decide the personal-best bonus. */
  bests: Bests;
  /** The UTC day (challenges.ts `dayOf`) that `dayXp` counts. */
  day: number;
  /** Score XP paid on `day`, against DAILY_XP_CAP. */
  dayXp: number;
};

export function freshState(): ProgressState {
  return {
    xp: { street: 0, fame: 0, hustle: 0 },
    title: null,
    visited: [],
    bests: {},
    day: 0,
    dayXp: 0,
  };
}

/** The Monday-to-Sunday UTC week a time falls in, as a whole number. */
export function weekOf(now: number): number {
  // 1970-01-01 was a Thursday, so shift three days to start weeks on Monday.
  return Math.floor((dayOf(now) + 3) / 7);
}

/** When a week begins, in ms: the inverse of `weekOf`. */
export function weekStartMs(week: number): number {
  return (week * 7 - 3) * DAY_MS;
}

/**
 * Whether a score could come from real play: finite, and not better than the
 * game's best grade bar by a wide margin (or, for lower-is-better games, not
 * below half the bar). shortcut: a forged score inside these bounds still
 * lands; the real fix is simulating the game on the server.
 */
export function isPlausibleScore(game: PrizeGame, score: number): boolean {
  if (!Number.isFinite(score) || Math.abs(score) >= 1e7) return false;
  const { grades, lower } = PRIZE_TABLES[game];
  const [top] = grades;
  if (!lower) return score >= 0 && score <= top * PLAUSIBLE_FACTOR;
  // Places and times can't reach zero; strokes against par can go negative.
  return score >= (top > 0 ? top / 2 : top - 8);
}

/** What a finished game paid. */
export type ScoreResult = {
  state: ProgressState;
  grade: PayGrade;
  ladder: Ladder;
  /** XP actually added, after the daily cap. */
  xp: number;
  /** A new all-time personal best. */
  best: boolean;
  /** The daily cap cut the award short (possibly to nothing). */
  capped: boolean;
};

function withXp(
  state: ProgressState,
  ladder: Ladder,
  xp: number,
): { state: ProgressState; xp: number } {
  const before = state.xp[ladder];
  const progression: Progression = { ...cleanProgression(null), xp: state.xp };
  const next = addXp(progression, ladder, xp).progression.xp;
  return { state: { ...state, xp: next }, xp: next[ladder] - before };
}

/** Grades a score and pays it, or null when the score is implausible. */
export function applyScore(
  state: ProgressState,
  game: PrizeGame,
  score: number,
  now: number,
): ScoreResult | null {
  if (!isPlausibleScore(game, score)) return null;
  const prize = prizeFor(game, score, state.bests[game]);
  // `now` was read before the state was loaded; never step the day backward
  const day = Math.max(dayOf(now), state.day);
  const paidToday = state.day === day ? state.dayXp : 0;
  const owed = prizeXp(prize.grade, prize.best);
  const ladder = GAME_LADDERS[game];
  const paid = withXp(state, ladder, Math.min(owed, DAILY_XP_CAP - paidToday));
  return {
    state: {
      ...paid.state,
      bests: prize.best ? { ...state.bests, [game]: score } : state.bests,
      day,
      dayXp: paidToday + paid.xp,
    },
    grade: prize.grade,
    ladder,
    xp: paid.xp,
    best: prize.best,
    capped: paid.xp < owed,
  };
}

/** The first visit to an album place pays Street XP; anything else nothing. */
export function applyVisit(
  state: ProgressState,
  room: RoomId,
): { state: ProgressState; ladder: Ladder; xp: number } {
  // 18+ servers don't exist yet, so adult rooms pay nothing.
  const visited = mayEnter(room, false) ? visit(state.visited, room) : [];
  if (visited.length <= state.visited.length)
    return { state, ladder: "street", xp: 0 };
  const paid = withXp({ ...state, visited }, "street", VISIT_XP);
  return { ...paid, ladder: "street" };
}

/** The state with a new title, or null when that title isn't earned. */
export function applyTitle(
  state: ProgressState,
  title: string | null,
): ProgressState | null {
  const before: Progression = {
    ...cleanProgression(null),
    xp: state.xp,
    title: state.title,
  };
  const after = selectTitle(before, title);
  // selectTitle hands back its input when the title isn't earned.
  return after === before ? null : { ...state, title: after.title };
}

/**
 * The client-facing Progression: the server's XP and title, with the
 * client-owned event claims (which pay local XP only) passed through.
 */
export function progressionOf(
  state: ProgressState,
  events: Progression["events"],
): Progression {
  return { version: 1, xp: { ...state.xp }, title: state.title, events };
}

/**
 * An account's first state: what its cloud save already says (earned before
 * the server kept progress), or nothing. Weekly boards ignore this import,
 * since they count only activity the server saw.
 */
export function seedState(save: SaveV1 | null): ProgressState {
  if (!save) return freshState();
  return {
    ...freshState(),
    xp: { ...save.progression.xp },
    title: save.progression.title,
    visited: [...save.visited],
    bests: { ...save.bests },
  };
}

function wholeNumber(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function parseJson(value: unknown): unknown {
  try {
    return typeof value === "string" ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

/**
 * A `progress` row from D1 as a state plus its revision (for optimistic
 * writes), or null if a number column is damaged. Damaged JSON columns fall
 * back to empty.
 */
export function parseProgressRow(
  row: unknown,
): { state: ProgressState; rev: number } | null {
  if (typeof row !== "object" || row === null) return null;
  const f = new Map<string, unknown>(Object.entries(row));
  const street = f.get("street_xp");
  const fame = f.get("fame_xp");
  const hustle = f.get("hustle_xp");
  const day = f.get("day");
  const dayXp = f.get("day_xp");
  const rev = f.get("rev");
  const title = f.get("title");
  if (
    !wholeNumber(street) ||
    !wholeNumber(fame) ||
    !wholeNumber(hustle) ||
    !wholeNumber(day) ||
    !wholeNumber(dayXp) ||
    !wholeNumber(rev)
  )
    return null;
  const visited = parseJson(f.get("visited"));
  const state: ProgressState = {
    ...freshState(),
    xp: { street, fame, hustle },
    visited: Array.isArray(visited) ? visited.filter(isRoomId) : [],
    bests: cleanBests(parseJson(f.get("bests"))),
    day,
    dayXp,
  };
  // keep a stored title only while it is still valid for these XP totals
  const kept = typeof title === "string" ? applyTitle(state, title) : null;
  return { state: kept ?? state, rev };
}
