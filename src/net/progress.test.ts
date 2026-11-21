// Server progress replies: valid bodies parse, and a reply with anything off
// (a negative XP, an unknown ladder or game, a malformed board) is refused.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseBoard,
  parseProgress,
  parseScoreOutcome,
  parseVisitOutcome,
} from "./progress.ts";

const progress = {
  xp: { street: 10, fame: 20, hustle: 30 },
  title: "fame:0",
  dailyXpLeft: 4900,
};

test("a progress reply carries XP per ladder, the title and the daily headroom", () => {
  assert.deepEqual(parseProgress(progress), progress);
  assert.deepEqual(parseProgress({ ...progress, title: null }), {
    ...progress,
    title: null,
  });
  for (const bad of [
    null,
    {},
    { ...progress, xp: { street: 1, fame: 2 } },
    { ...progress, xp: { ...progress.xp, fame: -1 } },
    { ...progress, xp: { ...progress.xp, fame: 1.5 } },
    { ...progress, title: 3 },
    { ...progress, dailyXpLeft: -1 },
    { ...progress, dailyXpLeft: "x" },
  ])
    assert.equal(parseProgress(bad), null, JSON.stringify(bad));
});

test("a score outcome adds the grade, ladder and what was paid", () => {
  const outcome = {
    ...progress,
    grade: "A",
    ladder: "fame",
    gained: 95,
    best: true,
    capped: false,
  };
  assert.deepEqual(parseScoreOutcome(outcome), outcome);
  for (const bad of [
    { ...outcome, grade: "Z" },
    { ...outcome, ladder: "nope" },
    { ...outcome, gained: -1 },
    { ...outcome, best: "yes" },
    { ...outcome, capped: undefined },
  ])
    assert.equal(parseScoreOutcome(bad), null, JSON.stringify(bad));
});

test("a visit outcome adds the ladder and what was paid", () => {
  const outcome = { ...progress, ladder: "street", gained: 30 };
  assert.deepEqual(parseVisitOutcome(outcome), outcome);
  assert.equal(parseVisitOutcome(progress), null);
  assert.equal(parseVisitOutcome({ ...outcome, ladder: "x" }), null);
});

test("a board has ranked entries and the caller's own line", () => {
  const board = {
    week: 2900,
    startsAt: 1,
    endsAt: 2,
    entries: [
      { rank: 1, name: "Ana", value: 190 },
      { rank: 2, name: "Bea", value: 150.5 },
    ],
    you: { rank: 2, value: 150.5 },
  };
  assert.deepEqual(parseBoard(board), board);
  assert.deepEqual(parseBoard({ ...board, you: null })?.you, null);
  for (const bad of [
    null,
    { ...board, entries: "x" },
    { ...board, entries: [{ rank: 0, name: "Ana", value: 1 }] },
    { ...board, entries: [{ rank: 1, name: "", value: 1 }] },
    { ...board, entries: [{ rank: 1, name: "Ana", value: NaN }] },
    { ...board, entries: Array.from({ length: 101 }, () => board.entries[0]) },
    { ...board, you: { rank: 1 } },
    { ...board, week: 1.5 },
  ])
    assert.equal(parseBoard(bad), null, JSON.stringify(bad));
});
