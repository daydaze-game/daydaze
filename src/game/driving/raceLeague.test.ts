// Race league: points per finish, season reducer validation, standings with tiebreaks, XP.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SEASON_LENGTH,
  FASTEST_LAP_BONUS,
  POINTS_BY_FINISH,
  RACE_XP,
  newSeason,
  raceXp,
  recordRace,
  standings,
  type RaceResult,
} from "./raceLeague.ts";

const race = (id: string, order: string[], fastest?: string): RaceResult => ({
  raceId: id,
  finishers: order,
  ...(fastest === undefined ? {} : { fastestLap: fastest }),
});

test("points follow the table and fastest lap adds a bonus", () => {
  const s = recordRace(newSeason("s1"), race("r1", ["a", "b", "c"], "c"));
  assert.ok(s.ok);
  if (!s.ok) return;
  const t = standings(s.season);
  assert.equal(t[0]?.points, POINTS_BY_FINISH[0]);
  assert.equal(t[1]?.points, POINTS_BY_FINISH[1]);
  assert.equal(t[2]?.points, (POINTS_BY_FINISH[2] ?? 0) + FASTEST_LAP_BONUS);
});

test("finishing outside the table scores 0 but still lists the player", () => {
  const names = Array.from(
    { length: POINTS_BY_FINISH.length + 2 },
    (_, i) => `p${i}`,
  );
  const r = recordRace(newSeason("s"), race("r", names));
  assert.ok(r.ok);
  if (!r.ok) return;
  const last = standings(r.season).at(-1);
  assert.equal(last?.points, 0);
  assert.equal(standings(r.season).length, names.length);
});

test("rejects duplicate races, duplicate drivers, empty fields and unknown fastest lap", () => {
  const s = recordRace(newSeason("s"), race("r1", ["a", "b"]));
  assert.ok(s.ok);
  if (!s.ok) return;
  assert.deepEqual(recordRace(s.season, race("r1", ["a"])), {
    ok: false,
    reason: "duplicate-race",
  });
  assert.deepEqual(recordRace(s.season, race("r2", ["a", "a"])), {
    ok: false,
    reason: "bad-field",
  });
  assert.deepEqual(recordRace(s.season, race("r2", [])), {
    ok: false,
    reason: "bad-field",
  });
  assert.deepEqual(recordRace(s.season, race("r2", ["a"], "z")), {
    ok: false,
    reason: "bad-field",
  });
});

test("a finished season takes no more races", () => {
  let season = newSeason("s", 1);
  const r = recordRace(season, race("r1", ["a"]));
  assert.ok(r.ok);
  if (!r.ok) return;
  season = r.season;
  assert.equal(season.complete, true);
  assert.deepEqual(recordRace(season, race("r2", ["a"])), {
    ok: false,
    reason: "season-over",
  });
});

test("recordRace does not mutate the season", () => {
  const s = newSeason("s");
  recordRace(s, race("r1", ["a"]));
  assert.equal(s.races.length, 0);
});

test("a full tie on points, wins and podiums goes to the latest race", () => {
  let season = newSeason("s");
  const add = (r: RaceResult) => {
    const out = recordRace(season, r);
    assert.ok(out.ok);
    if (out.ok) season = out.season;
  };
  add(race("r1", ["a", "b"]));
  add(race("r2", ["b", "a"]));
  const t = standings(season);
  assert.equal(t[0]?.points, t[1]?.points);
  // one win each, one 2nd each: latest race decides, b won it
  assert.equal(t[0]?.id, "b");
  assert.deepEqual(
    t.map((e) => e.rank),
    [1, 2],
  );
});

test("raceXp: finishing, podium and win are worth more", () => {
  assert.equal(raceXp(1, 8), RACE_XP.win);
  assert.ok(raceXp(2, 8) >= RACE_XP.podium);
  assert.ok(raceXp(7, 8) === RACE_XP.finish);
  assert.equal(raceXp(null, 8), RACE_XP.dnf);
  assert.ok(RACE_XP.win > RACE_XP.podium && RACE_XP.podium > RACE_XP.finish);
});

test("newSeason falls back to the default length for a non-finite one", () => {
  for (const bad of [NaN, Infinity, -Infinity])
    assert.equal(newSeason("s", bad).length, DEFAULT_SEASON_LENGTH);
  assert.equal(newSeason("s", 0).length, 1);
  assert.equal(newSeason("s", 3.9).length, 3);
});

test("raceXp: a place that is not a whole number counts as not finishing", () => {
  assert.equal(raceXp(2.5, 8), RACE_XP.dnf);
  assert.equal(raceXp(NaN, 8), RACE_XP.dnf);
  assert.equal(raceXp(Infinity, 8), RACE_XP.dnf);
});
