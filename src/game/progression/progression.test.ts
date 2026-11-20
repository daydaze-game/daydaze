// Progression boundaries, safe storage, immutable awards and earned titles.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addXp,
  cleanProgression,
  freshProgression,
  levelOf,
  levelStart,
  rankOf,
  RANK_XP,
  RANKS,
  selectTitle,
  titleLabel,
  totalXp,
  MAX_XP,
} from "./progression.ts";

test("levels start quickly, increase monotonically and stop at 100", () => {
  assert.equal(levelStart(1), 0);
  assert.equal(levelStart(2), 100);
  for (let level = 2; level <= 100; level++) {
    assert.equal(levelOf(levelStart(level) - 1), level - 1);
    assert.equal(levelOf(levelStart(level)), level);
  }
  assert.equal(levelOf(MAX_XP + 10000), 100);
  assert.equal(levelOf(-1), 1);
});

test("all three ladders have ten ranks at the exact boundaries", () => {
  for (const ladder of ["street", "fame", "hustle"] as const) {
    assert.equal(RANKS[ladder].length, 10);
    RANK_XP.forEach((xp, rank) => {
      assert.equal(rankOf(xp), rank);
      if (rank > 0) assert.equal(rankOf(xp - 1), rank - 1);
    });
  }
});

test("rank bonuses cross every threshold once, without mutating input", () => {
  const before = freshProgression();
  const result = addXp(before, "street", 1800);
  assert.equal(result.coins, 600);
  assert.deepEqual(before, freshProgression());
  assert.equal(result.progression.xp.street, 1800);
  assert.equal(totalXp(result.progression), 1800);
  assert.equal(addXp(result.progression, "street", 1).coins, 0);
  assert.equal(addXp(result.progression, "fame", 250).coins, 100);
  assert.equal(
    addXp(result.progression, "street", MAX_XP).progression.xp.street,
    MAX_XP,
  );
});

test("invalid or zero awards cannot grant XP or coins", () => {
  const p = freshProgression();
  for (const xp of [-1, 0, NaN, Infinity, 1.5]) {
    assert.equal(addXp(p, "street", xp).progression, p);
    assert.equal(addXp(p, "street", xp).coins, 0);
  }
});

test("only earned titles can be selected, removed, and restored", () => {
  const p = freshProgression();
  assert.equal(selectTitle(p, "street:1"), p);
  const earned = addXp(p, "street", 250).progression;
  const titled = selectTitle(earned, "street:1");
  assert.equal(titleLabel(titled), "Corner kid");
  assert.equal(titleLabel(selectTitle(titled, null)), null);
  assert.equal(selectTitle(earned, "street:99"), earned);
  assert.equal(selectTitle(earned, "made-up:1"), earned);
});

test("storage salvages valid XP, rejects future schemas and locked titles", () => {
  for (const raw of [
    null,
    undefined,
    [],
    "bad",
    { version: 2, xp: { street: 500 } },
  ])
    assert.deepEqual(cleanProgression(raw), freshProgression());
  const loaded = cleanProgression({
    version: 1,
    xp: { street: 800, fame: -3, hustle: Infinity },
    title: "fame:8",
  });
  assert.deepEqual(loaded.xp, { street: 800, fame: 0, hustle: 0 });
  assert.equal(loaded.title, null);
  assert.equal(
    cleanProgression({ version: 1, xp: { street: MAX_XP + 1 } }).xp.street,
    MAX_XP,
  );
  assert.equal(
    cleanProgression({ version: 1, xp: { street: 1.2 } }).xp.street,
    0,
  );
  const titled = selectTitle(
    addXp(freshProgression(), "fame", 800).progression,
    "fame:2",
  );
  assert.deepEqual(
    cleanProgression(JSON.parse(JSON.stringify(titled))),
    titled,
  );
  const a = freshProgression();
  a.xp.fame = 100;
  assert.equal(freshProgression().xp.fame, 0);
});
