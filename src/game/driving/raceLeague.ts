// Race league: seasons of races, points per finish, and standings with
// tiebreaks. Pure reducers over plain data; the XP each result is worth is data
// too, for the progression system to read.

/** Points for 1st, 2nd, ...; later finishers score 0. */
export const POINTS_BY_FINISH: readonly number[] = [
  25, 18, 15, 12, 10, 8, 6, 4, 2, 1,
];
export const FASTEST_LAP_BONUS = 1;
export const DEFAULT_SEASON_LENGTH = 8;

/** XP per race (feeds Street). `dnf` is for starting and not finishing. */
export const RACE_XP = { dnf: 5, finish: 15, podium: 30, win: 50 } as const;

export type RaceResult = {
  raceId: string;
  /** Driver ids in finishing order. Drivers who did not finish are left out. */
  finishers: readonly string[];
  fastestLap?: string;
};

export type Season = {
  id: string;
  /** Races the season runs for. */
  length: number;
  races: readonly RaceResult[];
  complete: boolean;
};

export type StandingEntry = {
  id: string;
  rank: number;
  points: number;
  wins: number;
  podiums: number;
  races: number;
};

export type RecordResult =
  | { ok: true; season: Season }
  | { ok: false; reason: "duplicate-race" | "bad-field" | "season-over" };

export function newSeason(id: string, length = DEFAULT_SEASON_LENGTH): Season {
  return {
    id,
    length: Math.max(1, Math.floor(length)),
    races: [],
    complete: false,
  };
}

/** Adds a race. The season completes when it reaches its length. */
export function recordRace(season: Season, result: RaceResult): RecordResult {
  if (season.complete || season.races.length >= season.length) {
    return { ok: false, reason: "season-over" };
  }
  if (season.races.some((r) => r.raceId === result.raceId)) {
    return { ok: false, reason: "duplicate-race" };
  }
  const ids = new Set(result.finishers);
  if (
    result.finishers.length === 0 ||
    ids.size !== result.finishers.length ||
    (result.fastestLap !== undefined && !ids.has(result.fastestLap))
  ) {
    return { ok: false, reason: "bad-field" };
  }
  const races = [
    ...season.races,
    { ...result, finishers: [...result.finishers] },
  ];
  return {
    ok: true,
    season: { ...season, races, complete: races.length >= season.length },
  };
}

/** Standings by points; ties go to wins, then podiums, then the latest race's finish, then id. */
export function standings(season: Season): StandingEntry[] {
  const rows = new Map<string, StandingEntry>();
  const row = (id: string): StandingEntry => {
    let e = rows.get(id);
    if (!e) {
      e = { id, rank: 0, points: 0, wins: 0, podiums: 0, races: 0 };
      rows.set(id, e);
    }
    return e;
  };
  for (const race of season.races) {
    race.finishers.forEach((id, i) => {
      const e = row(id);
      e.races += 1;
      e.points += POINTS_BY_FINISH[i] ?? 0;
      if (i === 0) e.wins += 1;
      if (i < 3) e.podiums += 1;
    });
    if (race.fastestLap !== undefined)
      row(race.fastestLap).points += FASTEST_LAP_BONUS;
  }
  // Latest-race position, newest first, as the last real tiebreak.
  const recent = (id: string): number[] =>
    season.races
      .map((r) => {
        const at = r.finishers.indexOf(id);
        return at === -1 ? Infinity : at;
      })
      .reverse();
  const sorted = [...rows.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.podiums !== a.podiums) return b.podiums - a.podiums;
    const ra = recent(a.id);
    const rb = recent(b.id);
    for (let i = 0; i < ra.length; i++) {
      const x = ra[i] ?? Infinity;
      const y = rb[i] ?? Infinity;
      if (x !== y) return x - y;
    }
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  return sorted.map((e, i) => ({ ...e, rank: i + 1 }));
}

/** XP for one race: `place` is 1-based, null for a driver who did not finish. */
export function raceXp(place: number | null, fieldSize: number): number {
  if (place === null || place < 1 || place > fieldSize) return RACE_XP.dnf;
  if (place === 1) return RACE_XP.win;
  if (place <= 3) return RACE_XP.podium;
  return RACE_XP.finish;
}
