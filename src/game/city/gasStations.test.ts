// The gas-station mart counters: where they stand and who is within reach.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  COUNTER_REACH,
  GAS_BLOCKERS,
  GAS_STATIONS,
  counterAt,
  counterOf,
} from "./gasStations.ts";
import { pointInPolygon } from "../walk.ts";

test("each counter is reachable on open ground in front of its mart", () => {
  for (const s of GAS_STATIONS) {
    const [x, z] = counterOf(s);
    assert.equal(counterAt(x, z), s);
    for (const poly of GAS_BLOCKERS)
      assert.equal(pointInPolygon(poly, [x, z]), false, s.id);
  }
});

test("a counter is out of reach beyond its radius, and from the street", () => {
  for (const s of GAS_STATIONS) {
    const [x, z] = counterOf(s);
    assert.equal(counterAt(x, z + COUNTER_REACH + 0.5), null);
    assert.equal(counterAt(s.street - s.side * 3, z), null);
  }
});
