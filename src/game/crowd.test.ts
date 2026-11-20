// The crowd people: real doll looks whose part files ship, poses from clips
// the doll has, and a bake list with each file once.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import {
  CROWD_BAKES,
  CROWD_LOOKS,
  CROWD_PEOPLE,
  POSE_CLIPS,
  crowdUrl,
} from "./crowd.ts";
import { MOCAP_CLIPS } from "./dance/mocap.ts";
import { modelSuffix, shoesOf, validateLook } from "./look.ts";

const shipped = (url: string) =>
  existsSync(new URL(`../../public${url}`, import.meta.url));
const clips = new Set(MOCAP_CLIPS.map((c) => c.id));

test("every crowd person wears a valid look whose parts ship", () => {
  for (const id of CROWD_LOOKS) {
    const { look } = CROWD_PEOPLE[id];
    assert.ok(validateLook(look), id);
    const m = modelSuffix(look);
    for (const part of [
      `hair-${look.hairStyle}`,
      `outfit-${look.outfit}`,
      `shoes-${shoesOf(look)}`,
    ])
      assert.ok(shipped(`/models/doll/${part}${m}.glb`), `${id}: ${part}${m}`);
  }
});

test("every pose comes from a clip the doll has", () => {
  for (const id of CROWD_LOOKS)
    assert.ok(clips.has(CROWD_PEOPLE[id].idle), CROWD_PEOPLE[id].idle);
  for (const { clip, at } of Object.values(POSE_CLIPS)) {
    assert.ok(clips.has(clip), clip);
    assert.ok(at >= 0 && at < 1);
  }
});

test("the bake list names each file once", () => {
  const urls = CROWD_BAKES.map((b) => crowdUrl(b.look, b.pose, b.tier));
  assert.equal(new Set(urls).size, urls.length);
});
