// Emotes together: each has its own move kept out of the solo picker, piggyback
// roles play their own moves, and the follower faces the leader.
import assert from "node:assert/strict";
import { test } from "node:test";
import { decodeAction, encodeAction } from "../peerAction.ts";
import { danceMove, eyesShut, PICKER_DANCE_MOVES } from "./moves.ts";
import {
  followSpot,
  liftOf,
  mirrored,
  parsePairMessage,
  roleMove,
  TOGETHER,
} from "./together.ts";
import { must } from "../typed.ts";

const close = (a: number, b: number) => Math.abs(a - b) < 1e-9;

test("every emote together has its own move, kept out of the solo picker", () => {
  for (const e of TOGETHER)
    for (const move of [e.move, e.follow ?? e.move]) {
      assert.equal(danceMove(move).id, move);
      if (move !== "slow-dance")
        assert.ok(!PICKER_DANCE_MOVES.some((m) => m.id === move), e.id);
    }
});

test("a piggyback rider climbs on the leader's back, facing the same way", () => {
  const e = must(TOGETHER.find((x) => x.id === "piggyback"));
  const spot = followSpot("piggyback", [2, 3], 0);
  // yaw 0 faces +z: behind is -z
  assert.ok(close(spot.at[0], 2) && close(spot.at[1], 3 - e.gap));
  assert.ok(close(spot.yaw, 0));
  assert.ok(liftOf("piggyback") > 0.1);
});

test("the piggyback roles play their own moves; the others mirror one", () => {
  assert.equal(roleMove("piggyback", "lead"), "piggyback-carry");
  assert.equal(roleMove("piggyback", "follow"), "piggyback-ride");
  assert.equal(mirrored("piggyback"), false);
  assert.equal(roleMove("hug", "follow"), "hug");
  assert.equal(mirrored("hug"), true);
  assert.equal(liftOf("hug"), 0);
});

test("a piggyback rider's action code carries the riding move", () => {
  const ride = decodeAction("pair:piggyback:f");
  assert.equal(ride.dance, "piggyback-ride");
  assert.deepEqual(ride.pair, { emote: "piggyback", role: "follow" });
  assert.equal(decodeAction("pair:piggyback:l").dance, "piggyback-carry");
});

test("the follower faces the leader, gap meters in front", () => {
  const hug = must(TOGETHER.find((e) => e.id === "hug"));
  const spot = followSpot("hug", [2, 3], 0);
  // yaw 0 faces +z
  assert.ok(close(spot.at[0], 2) && close(spot.at[1], 3 + hug.gap));
  assert.ok(close(spot.yaw, Math.PI));
});

test("holding hands puts the follower at the leader's side, facing the same way", () => {
  const e = must(TOGETHER.find((x) => x.id === "hold-hands"));
  const spot = followSpot("hold-hands", [0, 0], Math.PI / 2);
  assert.ok(close(Math.hypot(...spot.at), e.gap));
  assert.ok(close(spot.yaw, Math.PI / 2));
  // facing +x, the follower stands on the right: +z
  assert.ok(spot.at[1] > 0);
});

test("pair messages over the game relay are validated", () => {
  const parse = (v: unknown) => parsePairMessage(JSON.stringify(v));
  assert.deepEqual(parse({ k: "pair-invite", e: "hug" }), {
    k: "pair-invite",
    e: "hug",
  });
  assert.deepEqual(parse({ k: "pair-accept", e: "slow-dance" }), {
    k: "pair-accept",
    e: "slow-dance",
  });
  assert.deepEqual(parse({ k: "pair-stop" }), { k: "pair-stop" });
  assert.equal(parse({ k: "pair-invite", e: "tango" }), null);
  assert.equal(parse({ k: "invite", seed: 4 }), null);
  assert.equal(parse("hug"), null);
  assert.equal(parse(null), null);
  assert.equal(parsePairMessage("{not json"), null);
  assert.equal(
    parsePairMessage(`{"k":"pair-stop","x":"${"a".repeat(300)}"}`),
    null,
  );
});

test("an emote together rides the action code, buzz and all", () => {
  for (const e of TOGETHER)
    for (const role of ["lead", "follow"] as const) {
      const code = encodeAction("dance", "groove", undefined, undefined, 3, {
        emote: e.id,
        role,
      });
      assert.ok(code.length <= 24, code);
      const got = decodeAction(code);
      assert.deepEqual(got.pair, { emote: e.id, role });
      assert.equal(got.mood, "dance");
      // each side's own move: the lead's, or a piggyback rider's
      assert.equal(got.dance, roleMove(e.id, role));
      assert.equal(got.buzz, 3);
    }
  assert.equal(decodeAction("pair:tango:l").pair, undefined);
});

test("the kisses face each other unmirrored, so heads tilt opposite ways", () => {
  for (const id of ["cheek-kiss", "kiss"] as const) {
    const e = must(TOGETHER.find((x) => x.id === id));
    // a mirrored follow tilts its head the same way the lead does, nose into nose
    assert.equal(mirrored(id), false, id);
    assert.equal(roleMove(id, "lead"), roleMove(id, "follow"), id);
    assert.equal(liftOf(id), 0, id);
    const spot = followSpot(id, [0, 0], 0);
    assert.ok(close(spot.at[1], e.gap) && close(spot.yaw, Math.PI), id);
    // close enough for lips to meet, never inside each other
    assert.ok(e.gap > 0.6 && e.gap < 1, id);
  }
});

test("a kiss runs on the pair clock, eyes closed while the lips meet", () => {
  for (const id of ["cheek-kiss", "kiss"] as const) {
    const move = danceMove(roleMove(id, "lead"));
    // both partners at the same moment of it, on any screen
    assert.equal(move.synced, true, id);
    const shut = must(move.shut);
    assert.ok(shut[0] > 0 && shut[1] < move.period, id);
    assert.equal(eyesShut(move, (shut[0] + shut[1]) / 2), true, id);
    assert.equal(eyesShut(move, shut[1] + 0.2), false, id);
    // a loop later: the same moment
    assert.equal(eyesShut(move, move.period + shut[0] + 0.05), true, id);
  }
  // the lips kiss holds about a second and a half
  const kiss = must(danceMove("kiss").shut);
  assert.ok(kiss[1] - kiss[0] >= 1.4 && kiss[1] - kiss[0] <= 1.8);
  assert.equal(eyesShut(danceMove("hug"), 1), false);
});
