// The street dealer's corner: a clear sidewalk spot, reachable from it.
import assert from "node:assert/strict";
import { test } from "node:test";
import { isBlocked } from "../area.ts";
import { pointInPolygon } from "../walk.ts";
import { DEALER_AT, DEALER_REACH, dealerNear } from "./dealer.ts";
import { CITY_AREA, CITY_SPAWN, CITY_SURFACES } from "./layout.ts";

test("the dealer stands on open sidewalk, well away from the spawn", () => {
  assert.ok(
    CITY_SURFACES.some(
      (s) => s.kind === "sidewalk" && pointInPolygon(s.polygon, DEALER_AT),
    ),
  );
  assert.equal(isBlocked(CITY_AREA, DEALER_AT), false);
  const [sx, sz] = CITY_SPAWN.position;
  assert.ok(Math.hypot(DEALER_AT[0] - sx, DEALER_AT[1] - sz) > 30);
});

test("the dealer is within reach only close by", () => {
  const [x, z] = DEALER_AT;
  assert.equal(dealerNear(x, z), true);
  assert.equal(dealerNear(x + DEALER_REACH - 0.1, z), true);
  assert.equal(dealerNear(x + DEALER_REACH + 0.5, z), false);
});
