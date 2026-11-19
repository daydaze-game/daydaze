// The reaction clock: it runs on rendered frames, so one long frame (a cold
// shader compile on a slow renderer) cannot swallow a reaction before a frame
// has drawn it (issue #81, the sidewalk-trip browser test).
import assert from "node:assert/strict";
import { test } from "node:test";
import { reactionSeconds } from "../../game/reactions.ts";
import {
  MAX_FRAME_SECONDS,
  react,
  reaction,
  reactingNow,
  tickReactionClock,
} from "./reaction.ts";

test("a reaction outlasts a frame far longer than the reaction itself", () => {
  reaction.playing = null;
  assert.ok(react("trip"));
  // the frame after the trip starts takes 10 s: longer than the 2.8 s clip
  tickReactionClock(10);
  assert.equal(reactingNow(), "trip", "a frame must still draw it");
  // later frames play it out
  const frames = Math.ceil(reactionSeconds("trip") / MAX_FRAME_SECONDS) + 1;
  for (let i = 0; i < frames; i++) tickReactionClock(10);
  assert.equal(reactingNow(), null);
  reaction.playing = null;
});
