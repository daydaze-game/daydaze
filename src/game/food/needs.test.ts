// Munchies and dry mouth are bounded, adult-only needs; food relieves hunger,
// nonalcoholic drinks relieve thirst, and neither changes intoxication.
import { test } from "node:test";
import assert from "node:assert/strict";
import { freshNeeds, stepNeeds, satisfyNeed } from "./needs.ts";

test("weed builds both needs in proportion to its felt level", () => {
  const empty = freshNeeds();
  assert.equal(stepNeeds(empty, 1, 30, true).hunger, 0.25);
  assert.ok(Math.abs(stepNeeds(empty, 1, 30, true).thirst - 1 / 3) < 1e-12);
  assert.equal(stepNeeds(empty, 0.5, 30, true).hunger, 0.125);
  assert.ok(Math.abs(stepNeeds(empty, 0.5, 30, true).thirst - 1 / 6) < 1e-12);
  assert.deepEqual(empty, freshNeeds());
  assert.deepEqual(stepNeeds(empty, 0.1, 30, true), empty);
});

test("needs are capped, fade sober and never develop at 13+", () => {
  assert.deepEqual(stepNeeds(freshNeeds(), 1, 1000, true), {
    hunger: 1,
    thirst: 1,
  });
  assert.deepEqual(stepNeeds({ hunger: 1, thirst: 1 }, 0, 30, true), {
    hunger: 0.5,
    thirst: 0.5,
  });
  assert.deepEqual(
    stepNeeds({ hunger: 1, thirst: 1 }, 0, 1000, true),
    freshNeeds(),
  );
  assert.deepEqual(
    stepNeeds({ hunger: 1, thirst: 1 }, 1, 30, false),
    freshNeeds(),
  );
});

test("invalid elapsed time is inert and invalid levels cannot create needs", () => {
  const needs = { hunger: 0.5, thirst: 0.5 };
  for (const dt of [-1, 0, NaN, Infinity])
    assert.deepEqual(stepNeeds(needs, 1, dt, true), needs);
  for (const level of [NaN, Infinity, -1])
    assert.deepEqual(stepNeeds(freshNeeds(), level, 10, true), freshNeeds());
});

test("food and soft drinks relieve the matching need without crossing zero", () => {
  const needs = { hunger: 1, thirst: 1 };
  assert.deepEqual(satisfyNeed(needs, "food"), { hunger: 0.35, thirst: 1 });
  assert.deepEqual(satisfyNeed(needs, "drink"), {
    hunger: 1,
    thirst: 0.19999999999999996,
  });
  assert.deepEqual(satisfyNeed(freshNeeds(), "food"), freshNeeds());
  assert.deepEqual(satisfyNeed(freshNeeds(), "drink"), freshNeeds());
  assert.deepEqual(needs, { hunger: 1, thirst: 1 });
});
