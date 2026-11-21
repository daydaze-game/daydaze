// The database side of server-owned progress: loading and seeding an account's row,
// writing a graded score or visit together with its weekly-board rows, and
// reading the boards. The rules live in ../progressCore.ts; this only moves
// them to and from D1 (anything shaped like `Db`, so Node tests run it on SQLite). Guests have no row (their progress is local).

import type { PrizeGame } from "../../src/game/prizes.ts";
import { PRIZE_TABLES } from "../../src/game/prizes.ts";
import type { Ladder } from "../../src/game/progression/progression.ts";
import type { Board } from "../../src/net/progress.ts";
import { loadSave } from "../../src/game/save.ts";
import {
  parseProgressRow,
  seedState,
  weekOf,
  weekStartMs,
  type ProgressState,
} from "./progressCore.ts";

/** The slice of D1 this module uses; `env.DB` fits, and so does a test shim. */
export type Statement = {
  bind(...values: unknown[]): Statement;
  first(): Promise<Record<string, unknown> | null>;
  all(): Promise<{ results: Record<string, unknown>[] }>;
  run(): Promise<unknown>;
};
export type Db = {
  prepare(sql: string): Statement;
  batch(statements: Statement[]): Promise<{ meta: { changes: number } }[]>;
};

/** Weeks of board history kept; older rows are deleted on each write. */
const KEEP_WEEKS = 8;
/** Rows a board returns. */
const BOARD_SIZE = 20;
/** Times a write that lost a race to another request re-reads and retries. */
const MAX_ATTEMPTS = 3;

/** A progress row and the revision it was read at. */
export type Loaded = { state: ProgressState; rev: number };

async function read(db: Db, userId: string): Promise<Loaded | null> {
  const row = await db
    .prepare("SELECT * FROM progress WHERE user_id = ?")
    .bind(userId)
    .first();
  return parseProgressRow(row);
}

/**
 * The account's progress, created on first contact from its stored cloud
 * save (what it earned before the server kept progress). Call before
 * replacing the save, so an upload can't choose its own starting point.
 */
export async function loadProgress(
  db: Db,
  userId: string,
  name: string,
): Promise<Loaded> {
  const existing = await read(db, userId);
  if (existing) return existing;
  const stored = await db
    .prepare("SELECT data FROM saves WHERE user_id = ?")
    .bind(userId)
    .first();
  const seed = seedState(
    typeof stored?.data === "string" ? loadSave(stored.data, name) : null,
  );
  await db
    .prepare(
      `INSERT OR IGNORE INTO progress
       (user_id, street_xp, fame_xp, hustle_xp, title, visited, bests,
        day, day_xp, rev, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?)`,
    )
    .bind(
      userId,
      seed.xp.street,
      seed.xp.fame,
      seed.xp.hustle,
      seed.title,
      JSON.stringify(seed.visited),
      JSON.stringify(seed.bests),
      Date.now(),
    )
    .run();
  // another request may have inserted first; read what is really there
  const loaded = await read(db, userId);
  if (!loaded) throw new Error("progress row missing after insert");
  return loaded;
}

/** What a write tells the client beyond the new totals (grade, XP gained). */
export type Outcome = Record<string, string | number | boolean>;

/** What a write adds to the weekly boards. */
export type WeeklyEffects = {
  /** The score to offer the game's board (its best this week wins). */
  score?: { game: PrizeGame; value: number };
  xp?: { ladder: Ladder; amount: number };
};

/**
 * Writes the next state if the row is still at `rev` and, in the same batch
 * and only then, the weekly rows. Returns false when another request got in
 * first, having changed nothing; the caller re-reads and decides again.
 *
 * Batches run in one transaction, so the weekly rows come first, each guarded
 * by "the row is still at the revision we read", and the UPDATE that bumps
 * the revision comes last. Checking for the bumped revision afterwards would
 * wrongly pass when the other request's write happened to land on it.
 */
async function write(
  db: Db,
  userId: string,
  from: Loaded,
  next: ProgressState,
  effects: WeeklyEffects,
  now: number,
): Promise<boolean> {
  const week = weekOf(now);
  const applied =
    "EXISTS (SELECT 1 FROM progress WHERE user_id = ? AND rev = ?)";
  const statements: Statement[] = [];
  const { score, xp } = effects;
  if (score) {
    // `better` is one of two fixed operators, never request input
    const better = PRIZE_TABLES[score.game].lower ? "<" : ">";
    const pick = PRIZE_TABLES[score.game].lower ? "MIN" : "MAX";
    statements.push(
      db
        .prepare(
          `INSERT INTO weekly_scores (week, game, user_id, score, at)
         SELECT ?, ?, ?, ?, ? WHERE ${applied}
         ON CONFLICT (week, game, user_id) DO UPDATE SET
           at = CASE WHEN excluded.score ${better} score THEN excluded.at ELSE at END,
           score = ${pick}(score, excluded.score)`,
        )
        .bind(week, score.game, userId, score.value, now, userId, from.rev),
    );
  }
  if (xp && xp.amount > 0)
    statements.push(
      db
        .prepare(
          `INSERT INTO weekly_xp (week, ladder, user_id, xp, at)
         SELECT ?, ?, ?, ?, ? WHERE ${applied}
         ON CONFLICT (week, ladder, user_id) DO UPDATE SET
           xp = xp + excluded.xp, at = excluded.at`,
        )
        .bind(week, xp.ladder, userId, xp.amount, now, userId, from.rev),
    );
  statements.push(
    db
      .prepare(
        `UPDATE progress
          SET street_xp = ?, fame_xp = ?, hustle_xp = ?, title = ?,
              visited = ?, bests = ?, day = ?, day_xp = ?,
              rev = rev + 1, updated_at = ?
        WHERE user_id = ? AND rev = ?`,
      )
      .bind(
        next.xp.street,
        next.xp.fame,
        next.xp.hustle,
        next.title,
        JSON.stringify(next.visited),
        JSON.stringify(next.bests),
        next.day,
        next.dayXp,
        now,
        userId,
        from.rev,
      ),
  );
  const updateAt = statements.length - 1;
  const oldest = week - KEEP_WEEKS;
  statements.push(
    db.prepare("DELETE FROM weekly_scores WHERE week < ?").bind(oldest),
    db.prepare("DELETE FROM weekly_xp WHERE week < ?").bind(oldest),
  );
  const results = await db.batch(statements);
  return results[updateAt]?.meta.changes === 1;
}

/**
 * Reads the account's progress, lets `decide` produce the next state and its
 * weekly effects, and writes it; retries when another request wrote first.
 * `decide` returns null to refuse (nothing is written); `null` comes back
 * then, and `"busy"` after repeated lost races.
 */
export async function updateProgress(
  db: Db,
  userId: string,
  name: string,
  now: number,
  decide: (
    state: ProgressState,
  ) => { state: ProgressState; effects: WeeklyEffects; result: Outcome } | null,
): Promise<{ state: ProgressState; result: Outcome } | null | "busy"> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const from = await loadProgress(db, userId, name);
    const decided = decide(from.state);
    if (!decided) return null;
    // nothing changed (a place already visited): no write, no revision bump
    if (decided.state === from.state)
      return { state: from.state, result: decided.result };
    if (await write(db, userId, from, decided.state, decided.effects, now))
      return { state: decided.state, result: decided.result };
  }
  return "busy";
}

function entryFrom(row: Record<string, unknown>, rank: number) {
  const { name, value } = row;
  return typeof name === "string" && typeof value === "number"
    ? [{ rank, name, value }]
    : [];
}

function rankOf(row: Record<string, unknown> | null) {
  return typeof row?.value === "number" && typeof row.rank === "number"
    ? { rank: row.rank, value: row.value }
    : null;
}

/**
 * This week's best scores in one game, best first. Banned players are left
 * off; the board shows usernames only, never ids.
 */
export async function scoreBoard(
  db: Db,
  game: PrizeGame,
  userId: string,
  now: number,
): Promise<Board> {
  const week = weekOf(now);
  const lower = PRIZE_TABLES[game].lower === true;
  // both operators are fixed strings, never request input
  const order = lower ? "ASC" : "DESC";
  const better = lower ? "<" : ">";
  const { results } = await db
    .prepare(
      `SELECT u.username AS name, w.score AS value
       FROM weekly_scores w JOIN users u ON u.id = w.user_id
      WHERE w.week = ?1 AND w.game = ?2
        AND NOT EXISTS (SELECT 1 FROM bans b WHERE b.player_id = w.user_id)
      ORDER BY w.score ${order}, w.at ASC LIMIT ${BOARD_SIZE}`,
    )
    .bind(week, game)
    .all();
  const mine = await db
    .prepare(
      `SELECT m.score AS value,
            1 + (SELECT COUNT(*) FROM weekly_scores o
                  WHERE o.week = m.week AND o.game = m.game
                    AND (o.score ${better} m.score
                         OR (o.score = m.score AND o.at < m.at))) AS rank
       FROM weekly_scores m
      WHERE m.week = ?1 AND m.game = ?2 AND m.user_id = ?3`,
    )
    .bind(week, game, userId)
    .first();
  return {
    week,
    startsAt: weekStartMs(week),
    endsAt: weekStartMs(week + 1),
    entries: results.flatMap((row, i) => entryFrom(row, i + 1)),
    you: rankOf(mine),
  };
}

/** This week's XP earned on one ladder, most first. */
export async function ladderBoard(
  db: Db,
  ladder: Ladder,
  userId: string,
  now: number,
): Promise<Board> {
  const week = weekOf(now);
  const { results } = await db
    .prepare(
      `SELECT u.username AS name, w.xp AS value
       FROM weekly_xp w JOIN users u ON u.id = w.user_id
      WHERE w.week = ?1 AND w.ladder = ?2
        AND NOT EXISTS (SELECT 1 FROM bans b WHERE b.player_id = w.user_id)
      ORDER BY w.xp DESC, w.at ASC LIMIT ${BOARD_SIZE}`,
    )
    .bind(week, ladder)
    .all();
  const mine = await db
    .prepare(
      `SELECT m.xp AS value,
            1 + (SELECT COUNT(*) FROM weekly_xp o
                  WHERE o.week = m.week AND o.ladder = m.ladder
                    AND (o.xp > m.xp OR (o.xp = m.xp AND o.at < m.at))) AS rank
       FROM weekly_xp m
      WHERE m.week = ?1 AND m.ladder = ?2 AND m.user_id = ?3`,
    )
    .bind(week, ladder, userId)
    .first();
  return {
    week,
    startsAt: weekStartMs(week),
    endsAt: weekStartMs(week + 1),
    entries: results.flatMap((row, i) => entryFrom(row, i + 1)),
    you: rankOf(mine),
  };
}
