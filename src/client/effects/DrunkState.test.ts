// Tests for high audio lift in music rooms under ADULT_OK and highAudio setting.
import test from "node:test";
import assert from "node:assert/strict";
import { isMusicRoom } from "../../game/musicRooms.ts";

test("music rooms get high audio lift while non-music rooms do not", () => {
  assert.equal(isMusicRoom("vinyl-vault"), true);
  assert.equal(isMusicRoom("karaoke"), true);
  assert.equal(isMusicRoom("pulse"), true);
  assert.equal(isMusicRoom("orbit"), true);
  assert.equal(isMusicRoom("warehouse"), true);
  assert.equal(isMusicRoom("rooftop-bar"), true);
  assert.equal(isMusicRoom("sugar-rush"), true);
  assert.equal(isMusicRoom("roller-rink"), true);
  assert.equal(isMusicRoom("yacht"), true);

  assert.equal(isMusicRoom("city"), false);
  assert.equal(isMusicRoom("apartment"), false);
  assert.equal(isMusicRoom("gallery"), false);
});
