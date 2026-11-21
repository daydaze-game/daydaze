// Music rooms where the high audio lift plays: includes vinyl vault, karaoke,
// and DJ clubs, but excludes standard shops, city streets, etc.
import test from "node:test";
import assert from "node:assert/strict";
import { MUSIC_ROOMS, isMusicRoom } from "./musicRooms.ts";
import { ROOMS } from "./rooms.ts";

test("music rooms include vinyl vault, karaoke, and DJ venues", () => {
  assert.ok(isMusicRoom("vinyl-vault"));
  assert.ok(isMusicRoom("karaoke"));
  assert.ok(isMusicRoom("pulse"));
  assert.ok(isMusicRoom("orbit"));
  assert.ok(isMusicRoom("warehouse"));
  assert.ok(isMusicRoom("rooftop-bar"));
  assert.ok(isMusicRoom("sugar-rush"));
  assert.ok(isMusicRoom("roller-rink"));
  assert.ok(isMusicRoom("yacht"));
});

test("non-music rooms do not get the lift", () => {
  assert.equal(isMusicRoom("city"), false);
  assert.equal(isMusicRoom("bookshop"), false);
  assert.equal(isMusicRoom("museum"), false);
  assert.equal(isMusicRoom("bowling"), false);
});

test("every music room is a valid registered room in ROOMS", () => {
  for (const room of MUSIC_ROOMS) {
    assert.ok(ROOMS[room], `Expected ${room} to exist in ROOMS`);
  }
});
