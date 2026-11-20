// Kissing across heights: face heights by doll and height slider, the two
// sides of a reach meeting in the middle, and a reach laid onto a pose.
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_BODY } from "../body.ts";
import { DEFAULT_LOOK } from "../look.ts";
import { createPose, danceMove, poseAt } from "./moves.ts";
import { applyReach, faceDepth, faceHeight, reachFor } from "./reach.ts";

const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;

test("a face sits higher on a man's doll and on a taller slider", () => {
  const her = faceHeight(DEFAULT_LOOK, DEFAULT_BODY);
  const him = faceHeight({ ...DEFAULT_LOOK, body: "masculine" }, DEFAULT_BODY);
  const tall = faceHeight(DEFAULT_LOOK, { ...DEFAULT_BODY, height: 100 });
  const short = faceHeight(DEFAULT_LOOK, { ...DEFAULT_BODY, height: 0 });
  assert.ok(him > her + 0.03);
  assert.ok(tall > her && her > short);
  assert.ok(tall - short > 0.15 && tall - short < 0.25);
});

test("partners of one height reach nothing", () => {
  assert.deepEqual(reachFor(1.5, 1.5), { drop: 0, rise: 0, nod: 0, back: 0 });
});

test("the shorter rises on their toes, the taller bends, and they meet", () => {
  for (const d of [0.02, 0.06, 0.1, 0.14, 0.18]) {
    const tall = reachFor(1.5 + d, 1.5);
    const short = reachFor(1.5, 1.5 + d);
    assert.equal(tall.rise, 0);
    assert.equal(short.drop, 0);
    assert.ok(short.rise > 0 && short.rise <= 0.05, `rise ${short.rise}`);
    assert.ok(tall.drop > 0 && tall.drop <= 0.14, `drop ${tall.drop}`);
    // the taller bows, the shorter lifts the chin
    assert.ok(tall.nod > 0 && short.nod < 0);
    // within reach, the two close the whole difference between them
    if (d <= 0.19) assert.ok(near(short.rise + tall.drop, d), `d ${d}`);
  }
});

test("a reach bends the knees or points the feet, more as the kiss leans in", () => {
  const kiss = danceMove("kiss");
  const pose = poseAt(kiss, 1.5, createPose());
  const before = structuredClone(pose);
  applyReach(pose, reachFor(1.62, 1.5), 1);
  assert.ok(pose.root[1] < before.root[1] - 0.05, "the taller sinks");
  assert.ok(pose.joints.lShin[0] > before.joints.lShin[0], "knees bend");
  assert.ok(pose.joints.head[0] > before.joints.head[0], "head bows");
  const up = poseAt(kiss, 1.5, createPose());
  applyReach(up, reachFor(1.5, 1.62), 1);
  assert.ok(up.root[1] > before.root[1] + 0.04, "the shorter rises");
  assert.ok(up.joints.lFoot[0] > before.joints.lFoot[0], "on tiptoe");
  // a man's face, further forward, stands back as he leans in
  const him = poseAt(kiss, 1.5, createPose());
  const back = faceDepth({ ...DEFAULT_LOOK, body: "masculine" });
  assert.ok(back > 0 && faceDepth(DEFAULT_LOOK) === 0);
  applyReach(him, reachFor(1.5, 1.5, back), 1);
  assert.ok(near(him.root[2], before.root[2] - back));
  // no weight, no change
  const still = poseAt(kiss, 1.5, createPose());
  applyReach(still, reachFor(1.62, 1.5), 0);
  assert.deepEqual(still, before);
});
