// Local progression: gentle levels, three permanent ladders, rank coins and
// earned titles. Stored XP is validated independently of the outer save.

import { CLUB_NIGHTS, type ClubNight } from "../events.ts";

export const LADDERS = ["street", "fame", "hustle"] as const;
export type Ladder = (typeof LADDERS)[number];
export const RANKS = {
  street: [
    "Nobody",
    "Corner kid",
    "Hustler",
    "Runner",
    "Crew",
    "Shot caller",
    "Boss",
    "Kingpin",
    "Legend",
    "Myth",
  ],
  fame: [
    "Unknown",
    "Local",
    "Regular",
    "It girl",
    "Influencer",
    "Headliner",
    "Icon",
    "Star",
    "Superstar",
    "Legend",
  ],
  hustle: [
    "Broke",
    "Getting by",
    "Steady",
    "Comfortable",
    "Rich",
    "Mogul",
    "Tycoon",
    "Magnate",
    "Empire",
    "Dynasty",
  ],
} as const;
export const RANK_XP = [
  0, 250, 800, 1800, 3500, 6000, 10000, 16000, 25000, 40000,
] as const;

export type Progression = {
  version: 1;
  xp: Record<Ladder, number>;
  title: string | null;
  /** Most recent paid occurrence's end time, one bounded entry per night. */
  events: Partial<Record<ClubNight["id"], number>>;
};

export function freshProgression(): Progression {
  return {
    version: 1,
    xp: { street: 0, fame: 0, hustle: 0 },
    title: null,
    events: {},
  };
}

/** Cumulative XP for a level, clamped to the playable range. */
export function levelStart(level: number): number {
  const n = Math.min(100, Math.max(1, Math.floor(level))) - 1;
  return 100 * n + 25 * n * (n - 1);
}
export const MAX_XP = levelStart(100);

export function totalXp(p: Progression): number {
  return Math.min(MAX_XP, p.xp.street + p.xp.fame + p.xp.hustle);
}

export function levelOf(xp: number): number {
  let level = 1;
  while (level < 100 && xp >= levelStart(level + 1)) level++;
  return level;
}

/** Zero-based rank index; the initial rank is always available. */
export function rankOf(xp: number): number {
  let rank = 0;
  while (rank < RANK_XP.length - 1 && xp >= RANK_XP[rank + 1]) rank++;
  return rank;
}

export function titleLabel(p: Progression): string | null {
  for (const ladder of LADDERS)
    for (let rank = 0; rank <= rankOf(p.xp[ladder]); rank++)
      if (p.title === `${ladder}:${rank}`) return RANKS[ladder][rank];
  return null;
}

export function selectTitle(p: Progression, title: string | null): Progression {
  if (title === null) return { ...p, title: null };
  const next = { ...p, title };
  return titleLabel(next) === null ? p : next;
}

/** Invalid grants are inert. Rank coins are returned with the new XP so a
 * caller can commit both together, with no claim button to replay. */
export function addXp(
  p: Progression,
  ladder: Ladder,
  xp: number,
): { progression: Progression; coins: number } {
  if (!Number.isSafeInteger(xp) || xp <= 0) return { progression: p, coins: 0 };
  const before = rankOf(p.xp[ladder]);
  const nextXp = Math.min(MAX_XP, p.xp[ladder] + xp);
  if (nextXp === p.xp[ladder]) return { progression: p, coins: 0 };
  let coins = 0;
  for (let rank = before + 1; rank <= rankOf(nextXp); rank++)
    coins += rank * 100;
  return { progression: { ...p, xp: { ...p.xp, [ladder]: nextXp } }, coins };
}

function fields(value: unknown): Map<string, unknown> {
  return new Map(
    typeof value === "object" && value !== null ? Object.entries(value) : [],
  );
}

export function cleanProgression(value: unknown): Progression {
  const data = fields(value);
  const p = freshProgression();
  if (data.get("version") !== 1) return p;
  const xp = fields(data.get("xp"));
  for (const ladder of LADDERS) {
    const n = xp.get(ladder);
    if (typeof n === "number" && Number.isSafeInteger(n) && n >= 0)
      p.xp[ladder] = Math.min(MAX_XP, n);
  }
  const title = data.get("title");
  const events = fields(data.get("events"));
  for (const night of CLUB_NIGHTS) {
    const end = events.get(night.id);
    if (typeof end === "number" && Number.isSafeInteger(end) && end > 0)
      p.events[night.id] = end;
  }
  return typeof title === "string" ? selectTitle(p, title) : p;
}
