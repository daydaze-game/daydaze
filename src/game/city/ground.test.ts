// Ground types by place: boardwalk is wood, beach sand, lawn grass,
// the dog park and farmers market gravel, shoreline puddles, the rest pavement.
import { test } from "node:test";
import assert from "node:assert/strict";
import { groundAt } from "./ground.ts";
import { BOARDWALK, PARK, WATER_Z } from "./layout.ts";
import { DOG_PARK, MARKET_GREEN, PATH_EW, PATH_NS } from "./park.ts";

test("the boardwalk is wood, the beach sand, the lawn grass, the rest pavement", () => {
  const mid = (BOARDWALK.z0 + BOARDWALK.z1) / 2;
  assert.equal(groundAt(0, mid), "wood");
  assert.equal(groundAt(0, (BOARDWALK.z1 + WATER_Z) / 2), "sand");
  assert.equal(
    groundAt((PARK.x0 + PARK.x1) / 2, (PARK.z0 + PARK.z1) / 2),
    "grass",
  );
  assert.equal(groundAt(0, 0), "pavement");
});

test("shoreline water wash is puddle", () => {
  assert.equal(groundAt(0, WATER_Z - 1), "puddle");
  assert.equal(groundAt(0, WATER_Z), "puddle");
});

test("dog park and market green are gravel", () => {
  assert.equal(
    groundAt((DOG_PARK.x0 + DOG_PARK.x1) / 2, (DOG_PARK.z0 + DOG_PARK.z1) / 2),
    "gravel",
  );
  assert.equal(
    groundAt(
      (MARKET_GREEN.x0 + MARKET_GREEN.x1) / 2,
      (MARKET_GREEN.z0 + MARKET_GREEN.z1) / 2,
    ),
    "gravel",
  );
});

test("paved paths through the park are pavement", () => {
  assert.equal(
    groundAt((PATH_EW.x0 + PATH_EW.x1) / 2, (PATH_EW.z0 + PATH_EW.z1) / 2),
    "pavement",
  );
  assert.equal(
    groundAt((PATH_NS.x0 + PATH_NS.x1) / 2, (PATH_NS.z0 + PATH_NS.z1) / 2),
    "pavement",
  );
});
