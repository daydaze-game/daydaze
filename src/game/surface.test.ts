// Room floor surfaces: every room maps to an authentic footstep material.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ROOM_IDS } from "./roomTypes.ts";
import { roomSurface, type FootstepSurface } from "./surface.ts";

test("every registered room maps to a valid footstep surface", () => {
  const validSurfaces: ReadonlySet<FootstepSurface> = new Set<FootstepSurface>([
    "hard",
    "soft",
    "wood",
    "tile",
    "metal",
    "gravel",
    "puddle",
  ]);

  for (const id of ROOM_IDS) {
    const s = roomSurface(id);
    assert.ok(
      validSurfaces.has(s),
      `room ${id} returned unexpected surface: ${s}`,
    );
  }
});

test("specific venues map to their expected signature materials", () => {
  assert.equal(roomSurface("bowling"), "wood");
  assert.equal(roomSurface("boardwalk-arcade"), "wood");
  assert.equal(roomSurface("patisserie"), "tile");
  assert.equal(roomSurface("museum"), "tile");
  assert.equal(roomSurface("catwalk"), "metal");
  assert.equal(roomSurface("warehouse"), "metal");
  assert.equal(roomSurface("garden"), "gravel");
  assert.equal(roomSurface("mini-golf"), "soft");
  assert.equal(roomSurface("open-water"), "puddle");
});
