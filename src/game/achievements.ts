// Achievements engine: the typed stats object, the pure reducers that move it,
// the XP and ladder each action is worth (as data), and `newlyUnlocked`. The
// catalog itself lives in achievementCatalog.ts. Not wired to the save or the
// UI yet: callers own where the stats are stored. Pure.

import { ACHIEVEMENTS } from "./achievementCatalog.ts";

/** Every counter the achievements read. All are non-negative integers. */
export const STAT_KEYS = [
  // Minigames
  "gamesPlayed",
  "gamesWon",
  "gradesS",
  "gameVariety",
  // Places and collections
  "placesVisited",
  "closetSetsClaimed",
  "goldStickers",
  // Karaoke
  "karaokeSongs",
  "karaokeHighScores",
  "karaokeDuets",
  "karaokeVariety",
  // Fishing
  "fishCaught",
  "fishSpecies",
  "fishRare",
  // Farming
  "cropsPlanted",
  "cropsHarvested",
  "farmDaysTended",
  // Cars
  "carsOwned",
  "milesDriven",
  "carWrecks",
  "nightMiles",
  // Events
  "eventsAttended",
  "eventVariety",
  "clubNights",
  // Crime
  "crimesCommitted",
  "arrests",
  "chasesEscaped",
  "minutesInJail",
  "bailPaid",
  // City life
  "coinsEarned",
  "itemsBought",
  "outfitsChanged",
  "daysPlayed",
  "wavesSent",
  "chatsHad",
  "secretsFound",
] as const;

export type StatKey = (typeof STAT_KEYS)[number];
export type Stats = Record<StatKey, number>;

/** A fresh player: every counter at zero. */
export const NO_STATS: Stats = Object.freeze(
  Object.fromEntries(STAT_KEYS.map((k) => [k, 0])),
) as Stats;

export function isStatKey(value: unknown): value is StatKey {
  return typeof value === "string" && STAT_KEYS.some((k) => k === value);
}

/** Stored stats cleaned up: unknown keys dropped, bad values become 0. */
export function cleanStats(raw: unknown): Stats {
  const out: Stats = { ...NO_STATS };
  if (typeof raw !== "object" || raw === null) return out;
  for (const [key, value] of Object.entries(raw)) {
    if (!isStatKey(key)) continue;
    if (typeof value === "number" && Number.isFinite(value) && value > 0)
      out[key] = Math.floor(value);
  }
  return out;
}

/** `stats` with `key` raised by `amount` (counters only go up). */
export function bump(stats: Stats, key: StatKey, amount = 1): Stats {
  if (!Number.isFinite(amount) || amount <= 0) return { ...stats };
  return { ...stats, [key]: stats[key] + Math.floor(amount) };
}

/** `stats` with `key` raised to `value` if that's higher (distinct counts). */
export function raiseTo(stats: Stats, key: StatKey, value: number): Stats {
  if (!Number.isFinite(value) || value <= stats[key]) return { ...stats };
  return { ...stats, [key]: Math.floor(value) };
}

/** The three progression ladders from the progression design. */
export type Ladder = "street" | "fame" | "hustle";

export type ActionXp = { xp: number; ladder: Ladder };

/** XP each unit of a counter is worth, and which ladder it feeds. */
export const ACTION_XP: Record<StatKey, ActionXp> = {
  gamesPlayed: { xp: 3, ladder: "hustle" },
  gamesWon: { xp: 5, ladder: "hustle" },
  gradesS: { xp: 10, ladder: "fame" },
  gameVariety: { xp: 15, ladder: "hustle" },
  placesVisited: { xp: 20, ladder: "street" },
  closetSetsClaimed: { xp: 40, ladder: "fame" },
  goldStickers: { xp: 15, ladder: "fame" },
  karaokeSongs: { xp: 6, ladder: "fame" },
  karaokeHighScores: { xp: 12, ladder: "fame" },
  karaokeDuets: { xp: 10, ladder: "fame" },
  karaokeVariety: { xp: 8, ladder: "fame" },
  fishCaught: { xp: 2, ladder: "hustle" },
  fishSpecies: { xp: 12, ladder: "hustle" },
  fishRare: { xp: 15, ladder: "hustle" },
  cropsPlanted: { xp: 1, ladder: "hustle" },
  cropsHarvested: { xp: 2, ladder: "hustle" },
  farmDaysTended: { xp: 8, ladder: "hustle" },
  carsOwned: { xp: 30, ladder: "street" },
  milesDriven: { xp: 1, ladder: "street" },
  carWrecks: { xp: 1, ladder: "street" },
  nightMiles: { xp: 1, ladder: "street" },
  eventsAttended: { xp: 10, ladder: "street" },
  eventVariety: { xp: 15, ladder: "street" },
  clubNights: { xp: 12, ladder: "fame" },
  crimesCommitted: { xp: 4, ladder: "street" },
  arrests: { xp: 2, ladder: "street" },
  chasesEscaped: { xp: 15, ladder: "street" },
  minutesInJail: { xp: 0, ladder: "street" },
  bailPaid: { xp: 2, ladder: "street" },
  coinsEarned: { xp: 0, ladder: "hustle" },
  itemsBought: { xp: 3, ladder: "fame" },
  outfitsChanged: { xp: 1, ladder: "fame" },
  daysPlayed: { xp: 25, ladder: "street" },
  wavesSent: { xp: 1, ladder: "fame" },
  chatsHad: { xp: 2, ladder: "fame" },
  secretsFound: { xp: 40, ladder: "street" },
};

/** XP and ladder for `amount` of `key`, for a caller to add to its totals. */
export function xpFor(key: StatKey, amount = 1): ActionXp {
  const { xp, ladder } = ACTION_XP[key];
  return { xp: xp * Math.max(0, Math.floor(amount)), ladder };
}

export type Tier = "bronze" | "silver" | "gold" | "platinum";

/** XP for unlocking an achievement of each tier. */
export const TIER_XP: Record<Tier, number> = {
  bronze: 10,
  silver: 25,
  gold: 60,
  platinum: 120,
};

/** Unlocks when `stat` reaches `atLeast`. */
export type Condition = { stat: StatKey; atLeast: number };

export type Achievement = {
  id: string;
  title: string;
  description: string;
  /** Hidden ones show as "???" in the book until unlocked. */
  hidden: boolean;
  tier: Tier;
  when: Condition;
};

export function isMet(stats: Stats, c: Condition): boolean {
  return stats[c.stat] >= c.atLeast;
}

/** Achievements met by `stats`. */
export function unlockedIn(stats: Stats): Achievement[] {
  return ACHIEVEMENTS.filter((a) => isMet(stats, a.when));
}

/** Achievements `stats` meets that `prev` did not: what to toast now. */
export function newlyUnlocked(prev: Stats, stats: Stats): Achievement[] {
  return ACHIEVEMENTS.filter(
    (a) => isMet(stats, a.when) && !isMet(prev, a.when),
  );
}

/** Total XP from unlocking `list`. */
export function unlockXp(list: readonly Achievement[]): number {
  return list.reduce((sum, a) => sum + TIER_XP[a.tier], 0);
}

/** What a book shows for `a`: secrets stay masked until unlocked. */
export function displayed(
  a: Achievement,
  unlocked: boolean,
): { title: string; description: string } {
  if (a.hidden && !unlocked)
    return { title: "???", description: "A secret. Keep exploring." };
  return { title: a.title, description: a.description };
}
