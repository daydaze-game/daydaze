// Tests for outdoor smoking spots and after-dark rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SMOKING_SPOTS, isAfterDark, smokingSpotAt } from "./smokingSpots.ts";
import { BONFIRES } from "./layout.ts";

test("isAfterDark returns false during day and true after dark / dusk / night", () => {
  assert.equal(isAfterDark(12), false, "noon is not after dark");
  assert.equal(isAfterDark(14), false, "early afternoon is not after dark");
  assert.equal(isAfterDark(20.5), true, "dusk / evening is after dark");
  assert.equal(isAfterDark(23), true, "night is after dark");
  assert.equal(isAfterDark(0), true, "midnight is after dark");
  assert.equal(isAfterDark(2), true, "late night is after dark");
});

test("SMOKING_SPOTS covers boardwalk, beach and rooftops", () => {
  const ids = SMOKING_SPOTS.map((s) => s.id);
  assert.ok(ids.includes("boardwalk-bench"));
  assert.ok(ids.includes("beach-fire"));
  assert.ok(ids.includes("skylark-rooftop"));
  assert.ok(ids.includes("hotel-rooftop"));
});

test("smokingSpotAt identifies spots correctly by room and coordinates", () => {
  // Beach bonfire
  const beachSpot = smokingSpotAt("city", [BONFIRES[1][0], BONFIRES[1][1]]);
  assert.ok(beachSpot !== null);
  assert.equal(beachSpot.id, "beach-fire");

  // Far away in city
  assert.equal(smokingSpotAt("city", [0, 0]), null);

  // Skylark rooftop
  const skylark = smokingSpotAt("rooftop-bar", [0, 0]);
  assert.ok(skylark !== null);
  assert.equal(skylark.id, "skylark-rooftop");

  // Wrong room for skylark coords
  assert.equal(smokingSpotAt("city", [0, 0]), null);

  // Hotel rooftop
  const hotel = smokingSpotAt("hotel-rooftop", [0, 0]);
  assert.ok(hotel !== null);
  assert.equal(hotel.id, "hotel-rooftop");
});
