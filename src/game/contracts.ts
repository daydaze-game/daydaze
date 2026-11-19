// The contracts board: a few short contracts at a time, each pointing at a
// game the player has done least, spread across the progression ladders.
// Completing one pays XP to its ladder and the board refills. Pure and
// deterministic given a seed; the save and UI wire it in elsewhere.

import { PRIZE_GAMES, PRIZE_TABLES, type PrizeGame } from "./prizes.ts";
import type { PayGrade } from "./wallet.ts";

/** Contracts on the board at once (3 to 5). */
export const BOARD_SIZE = 4;

export const CONTRACT_LADDERS = ["street", "fame", "hustle"] as const;
export type ContractLadder = (typeof CONTRACT_LADDERS)[number];

/** Which ladder each game's contracts pay into. */
export const GAME_LADDER: Record<PrizeGame, ContractLadder> = {
  hoops: "street",
  penalties: "street",
  "field-goals": "street",
  bowling: "street",
  "mini-golf": "street",
  "driving-range": "street",
  skate: "street",
  gymnastics: "fame",
  "dance-off": "fame",
  fishing: "hustle",
  tennis: "street",
  "siren-song": "fame",
  "ice-show": "fame",
  "seal-show": "fame",
  runway: "fame",
  "laser-tag": "street",
  paintball: "street",
  barista: "hustle",
  "macaron-tower": "hustle",
  surf: "street",
  "skee-ball": "street",
  "wine-pour": "hustle",
  nails: "hustle",
  boba: "hustle",
  "halo-halo": "hustle",
  ramen: "hustle",
  sushi: "hustle",
  safari: "hustle",
  curling: "street",
  feeding: "hustle",
  reef: "hustle",
  speedway: "street",
  "jet-ski": "street",
  "bumper-cars": "street",
  "midway-whack": "street",
  "midway-gallery": "street",
  "midway-squirt": "street",
  "midway-rings": "street",
  "gem-glam": "fame",
  "star-siege": "street",
  trivia: "fame",
  "cook-off": "hustle",
  volleyball: "street",
  "range-pistol": "street",
  "range-rifle": "street",
  "cliff-dive": "street",
  "speed-slide": "street",
  "pool-volleyball": "street",
  "water-guns": "street",
  karaoke: "fame",
  haunted: "street",
  "reef-dive": "hustle",
  pottery: "hustle",
};

/** What a contract asks: play the game once, or reach a grade. */
export type ContractGoal =
  { kind: "play" } | { kind: "grade"; grade: Exclude<PayGrade, "C"> };

export type ContractXp = { ladder: ContractLadder; amount: number };

export type Contract = {
  /** Unique on a board: the game and the board serial it was dealt at. */
  id: string;
  game: PrizeGame;
  ladder: ContractLadder;
  goal: ContractGoal;
  /** Short text for the phone: "Get an A at Ramen Rush". */
  text: string;
  xp: ContractXp;
};

export type Board = {
  seed: number;
  /** Counts contracts dealt so far; feeds the picks so refills differ. */
  serial: number;
  contracts: Contract[];
};

/** What the player has done at each game. Missing means never played. */
export type History = Partial<
  Record<PrizeGame, { plays: number; best?: PayGrade }>
>;

/** XP each kind of goal is worth, as data. */
export const GOAL_XP = { play: 20, B: 30, A: 45, S: 70 } as const;

export function contractXp(goal: ContractGoal): number {
  return goal.kind === "play" ? GOAL_XP.play : GOAL_XP[goal.grade];
}

const GRADE_RANK: Record<PayGrade, number> = { C: 0, B: 1, A: 2, S: 3 };

/** Whether a grade satisfies a goal. */
export function meetsGoal(goal: ContractGoal, grade: PayGrade): boolean {
  return goal.kind === "play" || GRADE_RANK[grade] >= GRADE_RANK[goal.grade];
}

/** The next goal for a game given the best grade so far. */
function goalFor(entry: History[PrizeGame]): ContractGoal {
  if (!entry || entry.plays === 0) return { kind: "play" };
  const best = entry.best ?? "C";
  if (GRADE_RANK[best] < GRADE_RANK.A) return { kind: "grade", grade: "A" };
  return { kind: "grade", grade: "S" };
}

function textFor(game: PrizeGame, goal: ContractGoal): string {
  const label = PRIZE_TABLES[game].label;
  return goal.kind === "play"
    ? `Try ${label}`
    : `Get ${goal.grade === "A" ? "an" : "a"} ${goal.grade} at ${label}`;
}

/** A stable hash of integers to [0, 1). */
function rand(seed: number, serial: number, index: number): number {
  let h = Math.imul(seed | 0, 0x9e3779b1) ^ Math.imul(serial + 1, 0x85ebca6b);
  h ^= Math.imul(index + 1, 0xc2b2ae35);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  h = Math.imul(h, 0x297a2d39);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

/**
 * Picks `count` contracts for games not in `exclude`: each pick takes the
 * ladder fewest on the board so far (variety), then the least-played game on
 * it, ties broken by the seed. `existing` counts toward the ladder spread.
 */
export function pickContracts(
  seed: number,
  history: History,
  existing: readonly Contract[],
  count: number,
  serial = 0,
): Contract[] {
  const taken = new Set(existing.map((c) => c.game));
  const perLadder = new Map<ContractLadder, number>(
    CONTRACT_LADDERS.map((l) => [l, 0]),
  );
  for (const c of existing)
    perLadder.set(c.ladder, (perLadder.get(c.ladder) ?? 0) + 1);
  const out: Contract[] = [];
  for (let n = 0; n < count; n++) {
    const open = PRIZE_GAMES.filter((g) => !taken.has(g));
    const ladders = CONTRACT_LADDERS.filter((l) =>
      open.some((g) => GAME_LADDER[g] === l),
    );
    if (ladders.length === 0) break;
    const fewest = Math.min(...ladders.map((l) => perLadder.get(l) ?? 0));
    const pool = open.filter(
      (g) => (perLadder.get(GAME_LADDER[g]) ?? 0) === fewest,
    );
    const plays = (g: PrizeGame) => history[g]?.plays ?? 0;
    const least = Math.min(...pool.map(plays));
    const tied = pool.filter((g) => plays(g) === least);
    const game = tied[Math.floor(rand(seed, serial, n) * tied.length)];
    const ladder = GAME_LADDER[game];
    const goal = goalFor(history[game]);
    taken.add(game);
    perLadder.set(ladder, (perLadder.get(ladder) ?? 0) + 1);
    out.push({
      id: `${game}#${serial + n}`,
      game,
      ladder,
      goal,
      text: textFor(game, goal),
      xp: { ladder, amount: contractXp(goal) },
    });
  }
  return out;
}

/** A fresh board for a seed and history. */
export function newBoard(seed: number, history: History): Board {
  return {
    seed,
    serial: BOARD_SIZE,
    contracts: pickContracts(seed, history, [], BOARD_SIZE, 0),
  };
}

export type ContractResult = {
  board: Board;
  completed: Contract[];
  /** The XP paid, one entry per completed contract. */
  xp: ContractXp[];
};

/**
 * A finished game: completes the board's contract for it when the grade meets
 * the goal, then refills to BOARD_SIZE. `history` is the history including
 * this result, so the new contracts see it. Returns the same board object
 * when nothing completes.
 */
export function recordResult(
  board: Board,
  history: History,
  game: PrizeGame,
  grade: PayGrade,
): ContractResult {
  const completed = board.contracts.filter(
    (c) => c.game === game && meetsGoal(c.goal, grade),
  );
  if (completed.length === 0) return { board, completed: [], xp: [] };
  const kept = board.contracts.filter((c) => !completed.includes(c));
  const need = BOARD_SIZE - kept.length;
  const fresh = pickContracts(board.seed, history, kept, need, board.serial);
  // never re-offer the game just finished
  const refill = fresh.some((c) => c.game === game)
    ? pickContracts(
        board.seed,
        history,
        [...kept, ...completed],
        need,
        board.serial,
      )
    : fresh;
  return {
    board: {
      seed: board.seed,
      serial: board.serial + need,
      contracts: [...kept, ...refill],
    },
    completed,
    xp: completed.map((c) => c.xp),
  };
}
